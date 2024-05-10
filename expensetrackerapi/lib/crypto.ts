import express = require('express');
import coreModule = require('../modules/coreModule');
const _crypto = require('crypto');
import config = require('../config');
import logger = require('../controllers/logger');
export class crypto extends coreModule {
    private keyEncryption: string;
    constructor(request: express.Request) {
        super(request);
        this.keyEncryption = config.encryptionKey;
    }

    /**
     * encrypt data using aes-256-gcm
     * @param data data that need to encrypt
     * @param encryptionKey encryption Key (Optional)
     * return encrypted data
     */
    public encrypt = (data: string, encryptionKey?: string) => {
        let key = encryptionKey || this._decryptAES_256_GCM(this.tenant.configuration.encryptionKey, this.keyEncryption);
        return this._encryptAES_256_GCM(data, key);
    }


    /**
     * decrypt data using aes-256-gcm
     * @param data data that need to decrypt
     * @param encryptionKey encryption Key (Optional)
     * return decrypted data
     */
    public decrypt = (data: string, encryptionKey?: string) => {
        let key = encryptionKey || this._decryptAES_256_GCM(this.tenant.configuration.encryptionKey, this.keyEncryption);
        return this._decryptAES_256_GCM(data, key);
    }


    /**
     * encrypt data using aes-256-gcm
     * @param inputData data data that need to encrypt
     * @param encryptionKey encryption Key
     * return encrypted data
     */
    private _encryptAES_256_GCM = (inputData: string, encryptionKey: string) => {
        try {
            // random initialization vector
            const iv = _crypto.randomBytes(16);

            // random salt
            const salt = _crypto.randomBytes(64);

            // derive key: 32 byte key length - in assumption the masterkey is a cryptographic and NOT a password there is no need for
            // a large number of iterations. It may can replaced by HKDF
            const key = _crypto.pbkdf2Sync(encryptionKey, salt, 2145, 32, 'sha512');

            // AES 256 GCM Mode
            const cipher = _crypto.createCipheriv('aes-256-gcm', key, iv);

            // encrypt the given text
            const encrypted = Buffer.concat([cipher.update(inputData, 'utf8'), cipher.final()]);

            // extract the auth tag
            const tag = cipher.getAuthTag();

            // generate output
            return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
        } catch (ex) {
            logger.error(this.request, "Error while executing encrypting error : " + ex.toString(), "crypto", "", "catch", "1", "", ex);
            console.error("Error while encrypting in _encryptAES_256_GCM:" + ex.toString());
        }
    }

    /**
     * decrypt data using aes-256-gcm
     * @param encodedData data data that need to decrypt
     * @param encryptionKey encryption Key
     * return decrypted data
     */
    private _decryptAES_256_GCM = (encodedData: string, encryptionKey: string) => {
        try {
            // base64 decoding
            const bData = Buffer.from(encodedData, 'base64');

            // convert data to buffers
            const salt = bData.slice(0, 64);
            const iv = bData.slice(64, 80);
            const tag = bData.slice(80, 96);
            const text = bData.slice(96);

            // derive key using; 32 byte key length
            const key = _crypto.pbkdf2Sync(encryptionKey, salt, 2145, 32, 'sha512');

            // AES 256 GCM Mode
            const decipher = _crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);

            // encrypt the given text
            const decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');

            return decrypted;

        } catch (ex) {
            logger.error(this.request, "Error while executing decrypting error : " + ex.toString(), "crypto", "", "catch", "1", "", ex);
            console.error("Error while decrypting in _decryptAES_256_GCM:" + ex.toString());
        }
    }

    /**
     * encrypt data using aes-256-cbc
     * @param inputData data data that need to encrypt
     * @param encryptionKey encryption Key
     * return encrypted data
     */
    private _encryptAES_256_CBC = (inputData: string, encryptionKey: string) => {
        try {
            let iv = require('crypto').randomBytes(16);
            let data = new Buffer(inputData).toString('binary');

            let key = new Buffer(encryptionKey, "hex");
            let cipher = require('crypto').createCipheriv('aes-256-cbc', key, iv);

            let nodev = process.version.match(/^v(\d+)\.(\d+)/);

            let encrypted;

            if (nodev[1] === '0' && parseInt(nodev[2]) < 10) {
                encrypted = cipher.update(data, 'binary') + cipher.final('binary');
            } else {
                encrypted = cipher.update(data, 'utf8', 'binary') + cipher.final('binary');
            }

            let encoded = new Buffer(iv, 'binary').toString('hex') + new Buffer(encrypted, 'binary').toString('hex');

            return encoded;
        } catch (ex) {
            logger.error(this.request, "Error while executing _encryptAES_256_CBC error : " + ex.toString(), "crypto", "", "catch", "1", "", ex);
            console.error("Error while encrypting in _encryptAES_256_CBC:" + ex.toString());
        }
    }

    /**
     * decrypt data using aes-256-cbc
     * @param encodedData data data that need to decrypt
     * @param encryptionKey encryption Key
     * return decrypted data
     */
    private _decryptAES_256_CBC = (encodedData: string, encryptionKey: string) => {
        try {
            let combined = new Buffer(encodedData, 'hex');

            let key = new Buffer(encryptionKey, "hex");

            // Create iv
            let iv = new Buffer(16);

            combined.copy(iv, 0, 0, 16);
            let edata = combined.slice(16).toString('binary');

            // Decipher encrypted data
            let decipher = require('crypto').createDecipheriv('aes-256-cbc', key, iv);

            let nodev = process.version.match(/^v(\d+)\.(\d+)/);

            let decrypted, plaintext;
            if (nodev[1] === '0' && parseInt(nodev[2]) < 10) {
                decrypted = decipher.update(edata, 'binary') + decipher.final('binary');
                plaintext = new Buffer(decrypted, 'binary').toString('utf8');
            } else {
                plaintext = (decipher.update(edata, 'binary', 'utf8') + decipher.final('utf8'));
            }
            return plaintext;

        } catch (ex) {
            logger.error(this.request, "Error while executing _decryptAES_256_CBC error : " + ex.toString(), "crypto", "", "catch", "1", "", ex);
            console.error("Error while decrypting in _decryptAES_256_CBC:" + ex.toString());
        }
    }

}
