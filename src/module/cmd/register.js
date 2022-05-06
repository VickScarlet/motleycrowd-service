export default function register(uuid, {username, password}) {
    return $core.user.register(uuid, username, password);
}