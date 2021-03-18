import express = require('express');
import { EventNotification } from "../services/event.notification";
import { LogService } from "../util/log.services";
import { MessageEventNotification } from "../interfaces/event.message.notification";
import { RESTApi } from "../api/rest";
import { REST_EVENT_TYPES } from "../api/consts/rest.event.types";
import { Environment } from "../util/environment";
import { ENV_VARS } from "../util/consts/env.vars";
import { SPECIAL_MSG_TYPES } from "./consts/special.msg.types";
import { ChatServer } from '../business/chat.server';
import { JWTAuthorizer } from '../authorizer/authorizer';

const entity: string = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";

export class BusinessLayer {

    private log: LogService;
    private auth: JWTAuthorizer;
    private uidKey: string = Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid");
    constructor(private cs: ChatServer,
        private en: EventNotification,
        private rest: RESTApi) {
        this.log = LogService.getInstnce();
        this.auth = new JWTAuthorizer();
    }

    public async init() {

        this.rest.registerEventListener(async (event: MessageEventNotification) => {
            const payload = (!event.content.payload) ? '{}' : event.content.payload
            this.processRESTApiEvents(event.type, JSON.parse(payload), event.content[this.uidKey], event.content.res);
        });

        this.log.info(entity, 'Business layer ready!');
    }

    private async processRESTApiEvents(type: number, content: any, sender?: string, res?: express.Response) {
        //let address = Environment.getValue(ENV_VARS.SERVER_FINDER_URL, null);
        //let method = 'POST';
        switch (type) {
            case REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                let payload: any = this.processMessage(content.message);
                if (payload) {
                    //address += Environment.getValue(ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
                    //address += `/${sender}`;
                    this.sendMessage(payload, sender);

                } else {
                    if (this.processDirect(content.message)) {
                        let split = content.message.split(' ');
                        let msg = "";
                        for (let i = 2; i < split.length; i++) {
                            msg += split[i] + " ";
                        }
                        let uid = this.cs.getUid(split[1]);
                        if (!uid || msg.length === 0) break;
                        payload = {
                            message: msg,
                            userName: this.cs.getUserName(sender)
                        };

                      //  address += Environment.getValue(ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
                      //  address += `/${uid}`;
                      this.sendMessage(payload, uid);
                    } else {
                       /* address += Environment.getValue(ENV_VARS.EVENT_BROADCAST, 'broadcast');
                        payload = {};
                        payload['message'] = content.message;
                        payload[this.uidKey] = sender
                        payload["userName"] = this.cs.getUserName(sender)
                        method = 'PUT';*/
                        this.sendBroadcast(content.message, sender);
                    }
                }
               /* console.log(payload);
                const response = await this.en.request(address,
                    method,
                    {
                        payload: JSON.stringify(payload)
                    });
                console.log(response);*/
                break;

            case REST_EVENT_TYPES.CONNECTED:
                let token = content.jwt_auth_token;
                this.log.info(entity, `Token received: ${token} `)
                let authorized = this.auth.authorize(token, Environment.getValue(ENV_VARS.JWT_SECRET));
                const connectedMsg = `User ${authorized.content.name} connected`;
                this.log.info(entity, connectedMsg);
                this.cs.addUser(authorized.uid, authorized.content.name);
                this.sendBroadcast(connectedMsg, authorized.uid, true);
                break;


            case REST_EVENT_TYPES.DISCONNECTED:
                for (let user of content.users) {
                    const disconnectedMsg = `User ${this.cs.getUserName(user)} (${user}) disconnected`;
                    this.log.info(entity, disconnectedMsg);
                    this.cs.removeUser(user);
                    this.sendBroadcast(disconnectedMsg, sender, true);
                }
                break;

            default:
                break;
        }
    }

    private async sendMessage(payload: any, to: string) {
        let method = 'POST';
        let address = Environment.getValue(ENV_VARS.SERVER_FINDER_URL, null);
        address += Environment.getValue(ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
        address += `/${to}`;
        const response = await this.en.request(address,
            method,
            {
                payload: JSON.stringify(payload)
            });
        console.log(response);
        return response;
    }

    private async sendBroadcast(msg: string, sender: string, systemMsg:boolean = false) {
        let method = 'PUT';
        let address = Environment.getValue(ENV_VARS.SERVER_FINDER_URL, null);
        address += Environment.getValue(ENV_VARS.EVENT_BROADCAST, 'broadcast');
        let payload = {};
        payload['message'] = msg;
        payload[this.uidKey] = sender
        if(!systemMsg) payload["userName"] = this.cs.getUserName(sender);
        const response = await this.en.request(address,
            method,
            {
                payload: JSON.stringify(payload)
            });
        console.log(response);
        return response;
    }


    private processDirect(msg: string) {
        if (msg.substr(0, 4) === SPECIAL_MSG_TYPES.TO) return true;
    }

    private processMessage(msg: string) {
        switch (msg) {
            case SPECIAL_MSG_TYPES.GET_USERS:
                let userList: string = "";
                for (let user of this.cs.getAllUsers()) {
                    userList += `${user}\n`;
                }
                return { message: userList };
                break;
            case SPECIAL_MSG_TYPES.TOTAL_CONNECTED:
                return { message: `total users: ${this.cs.getAllUsers().length}` };
                break;
            default:
                return null;
                break;
        }
    }
}