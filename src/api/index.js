const API = {};
const registerAPI = function(api, fn) {
    API[api] = fn;
}
registerAPI('registerAPI', registerAPI);
export default API;