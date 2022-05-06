export default function authenticate(uuid, {username, password}) {
    return $core.user.authenticate(uuid, username, password);
}