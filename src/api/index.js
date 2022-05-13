import crypto from 'crypto';

const API = {};
const registerAPI = function(api, fn) {
    API[api] = fn;
}
registerAPI('registerAPI', registerAPI);
export default API;

registerAPI('passwordEncrypt', password => {
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    const md5 = crypto.createHash('md5').update(password).digest('hex');
    return crypto.createHash('sha256').update(sha256 + md5).digest('hex');
});