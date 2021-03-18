"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatServer = void 0;
class ChatServer {
    constructor() {
        this.users = {};
        this.userNames = {};
    }
    addUser(uid, userName) {
        this.users[uid] = userName;
        this.userNames[userName] = uid;
    }
    getUid(userName) {
        return this.userNames[userName];
    }
    getUserName(uid) {
        return this.users[uid];
    }
    removeUser(uid) {
        let userName = this.users[uid];
        delete this.users[uid];
        delete this.userNames[userName];
    }
    getAllUsers() {
        let users = [];
        for (let user in this.userNames) {
            users.push(user);
        }
        return users;
    }
}
exports.ChatServer = ChatServer;
