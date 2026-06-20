/* Data Access Object (DAO) module for accessing users data */

import db from './db.js';
import crypto from 'crypto';

export default function UserDao() {

    this.getUserById = (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row === undefined) {
                    resolve({ error: 'User not found.' });
                } else {
                    resolve({ id: row.id, username: row.username });
                }
            });
        });
    };

    this.getUserByCredentials = (username, password) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row === undefined) {
                    resolve(false);
                } else {
                    const user = { id: row.id, username: row.username };
                    crypto.scrypt(password, row.salt, 64, (err, hashedPassword) => {
                        if (err) reject(err);
                        else if (!crypto.timingSafeEqual(Buffer.from(row.password_hash, 'hex'), hashedPassword))
                            resolve(false);
                        else
                            resolve(user);
                    });
                }
            });
        });
    };

}
