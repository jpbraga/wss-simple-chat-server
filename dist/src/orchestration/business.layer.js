"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLayer = void 0;
const log_services_1 = require("../util/log.services");
const rest_event_types_1 = require("../api/consts/rest.event.types");
const environment_1 = require("../util/environment");
const env_vars_1 = require("../util/consts/env.vars");
const special_msg_types_1 = require("./consts/special.msg.types");
const authorizer_1 = require("../authorizer/authorizer");
const entity = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";
class BusinessLayer {
    constructor(cs, en, rest) {
        this.cs = cs;
        this.en = en;
        this.rest = rest;
        this.uidKey = environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_IDENTIFIER, "uid");
        this.log = log_services_1.LogService.getInstnce();
        this.auth = new authorizer_1.JWTAuthorizer();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.rest.registerEventListener((event) => __awaiter(this, void 0, void 0, function* () {
                const payload = (!event.content.payload) ? '{}' : event.content.payload;
                this.processRESTApiEvents(event.type, JSON.parse(payload), event.content[this.uidKey], event.content.res);
            }));
            this.log.info(entity, 'Business layer ready!');
        });
    }
    processRESTApiEvents(type, content, sender, res) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case rest_event_types_1.REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                    let payload = this.processMessage(content.message);
                    if (payload) {
                        this.sendMessage(payload, sender);
                    }
                    else {
                        if (this.processDirect(content.message)) {
                            let split = content.message.split(' ');
                            let msg = "";
                            for (let i = 2; i < split.length; i++) {
                                msg += split[i] + " ";
                            }
                            let uid = this.cs.getUid(split[1]);
                            if (!uid || msg.length === 0)
                                break;
                            payload = {
                                message: msg,
                                userName: this.cs.getUserName(sender)
                            };
                            this.sendMessage(payload, uid);
                        }
                        else {
                            this.sendBroadcast(content.message, sender);
                        }
                    }
                    break;
                case rest_event_types_1.REST_EVENT_TYPES.CONNECTED:
                    let token = content.jwt_auth_token;
                    this.log.info(entity, `Token received: ${token} `);
                    let authorized = this.auth.authorize(token, environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_SECRET));
                    const connectedMsg = `User ${authorized.content.name} connected`;
                    this.log.info(entity, connectedMsg);
                    this.cs.addUser(authorized.uid, authorized.content.name);
                    this.sendBroadcast(connectedMsg, authorized.uid, true);
                    break;
                case rest_event_types_1.REST_EVENT_TYPES.DISCONNECTED:
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
        });
    }
    sendMessage(payload, to) {
        return __awaiter(this, void 0, void 0, function* () {
            let method = 'POST';
            let address = environment_1.Environment.getValue(env_vars_1.ENV_VARS.SERVER_FINDER_URL, null);
            address += environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
            address += `/${to}`;
            const response = yield this.en.request(address, method, {
                payload: JSON.stringify(payload)
            });
            console.log(response);
            return response;
        });
    }
    sendBroadcast(msg, sender, systemMsg = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let method = 'PUT';
            let address = environment_1.Environment.getValue(env_vars_1.ENV_VARS.SERVER_FINDER_URL, null);
            address += environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_BROADCAST, 'broadcast');
            let payload = {};
            payload['message'] = msg;
            payload[this.uidKey] = sender;
            if (!systemMsg)
                payload["userName"] = this.cs.getUserName(sender);
            const response = yield this.en.request(address, method, {
                payload: JSON.stringify(payload)
            });
            console.log(response);
            return response;
        });
    }
    processDirect(msg) {
        if (msg.substr(0, 4) === special_msg_types_1.SPECIAL_MSG_TYPES.TO)
            return true;
    }
    processMessage(msg) {
        switch (msg) {
            case special_msg_types_1.SPECIAL_MSG_TYPES.GET_USERS:
                let userList = "";
                for (let user of this.cs.getAllUsers()) {
                    userList += `${user}\n`;
                }
                return { message: userList };
                break;
            case special_msg_types_1.SPECIAL_MSG_TYPES.TOTAL_CONNECTED:
                return { message: `total users: ${this.cs.getAllUsers().length}` };
                break;
            default:
                return null;
                break;
        }
    }
}
exports.BusinessLayer = BusinessLayer;
