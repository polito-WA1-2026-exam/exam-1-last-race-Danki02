import db from './db.js';
import crypto from 'crypto';

export default function UserDao() {

    // Looks up a user by id and returns { id, username }, or { error } if not found
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

    // Verifies credentials using scrypt: derives the hash from the stored salt and
    // compares it with timingSafeEqual to prevent timing-based attacks.
    // Returns { id, username } on success, false if the user doesn't exist or the password is wrong.
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
