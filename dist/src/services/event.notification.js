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
exports.EventNotification = void 0;
const http = require("http");
const https = require("https");
const env_vars_1 = require("../util/consts/env.vars");
const environment_1 = require("../util/environment");
const log_services_1 = require("../util/log.services");
const entity = 'EventNotification';
class EventNotification {
    constructor() {
        this.log = log_services_1.LogService.getInstnce();
    }
    _typedRequest(request, resourceURL, method, content) {
        return new Promise((resolve, reject) => {
            let req = request.request({
                method: method,
                hostname: resourceURL.hostname,
                port: resourceURL.port,
                path: resourceURL.pathname,
                timeout: environment_1.Environment.getValue(env_vars_1.ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                headers: {
                    "Content-Type": "application/json"
                }
            }, (res) => {
                res.resume();
                res.on('end', () => {
                    if (!res.complete) {
                        const errMsg = 'The connection was terminated while the message was still being sent';
                        this.log.error(entity, errMsg);
                        reject(errMsg);
                    }
                });
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    resolve(chunk);
                });
            });
            req.on('error', (e) => {
                this.log.error(entity, `Error requesting a ${method} at ${resourceURL.hostname}:${resourceURL.port}${resourceURL.pathname} - ${e}`);
                reject(e.message);
            });
            if (content)
                req.write(JSON.stringify(content));
            req.end();
        });
    }
    request(url, method, content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                this.log.error(entity, `The HOST for the ${method} method cannot be null`);
                throw new Error(`The HOST for the ${method} method cannot be null`);
            }
            const resourceURL = new URL(url);
            this.log.debug(entity, `Requesting a ${method} at ${url}`);
            switch (resourceURL.protocol) {
                case "http:":
                    this.log.info(entity, `Request to a insecure address`);
                    return yield this._typedRequest(http, resourceURL, method, content);
                    break;
                case "https:":
                    this.log.info(entity, `Request to a secure address`);
                    return yield this._typedRequest(https, resourceURL, method, content);
                    break;
                default:
                    throw new Error(`Protocol not identified in the provided url: ${url}`);
                    break;
            }
        });
    }
    _typedGet(request, resourceURL) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: resourceURL.hostname,
                    path: resourceURL.pathname,
                    port: resourceURL.port,
                    timeout: environment_1.Environment.getValue(env_vars_1.ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                    method: 'GET',
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
                const req = request.request(options, res => {
                    res.setEncoding('utf8');
                    res.on('data', d => {
                        resolve(d);
                    });
                });
                req.on('error', error => {
                    this.log.error(entity, `Error requesting a GET at ${resourceURL.host} - ${error}`);
                    reject(error);
                });
                req.end();
            });
        });
    }
    get(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url) {
                this.log.error(entity, `The HOST for the GET method cannot be null`);
                throw new Error(`The HOST for the GET method cannot be null`);
            }
            const resourceURL = new URL(url);
            this.log.debug(entity, `Requesting a GET at ${url}`);
            switch (resourceURL.protocol) {
                case "http:":
                    this.log.info(entity, `Request to a insecure address`);
                    return yield this._typedGet(http, resourceURL);
                    break;
                case "https:":
                    this.log.info(entity, `Request to a secure address`);
                    return yield this._typedGet(https, resourceURL);
                    break;
                default:
                    throw new Error(`Protocol not identified in the provided url: ${url}`);
                    break;
            }
        });
    }
}
exports.EventNotification = EventNotification;
