// shortcut: Worker-only globals that @dqfinance/api's types mention. The web only consumes AppType's
// route shapes, so `any` is safe here; replace with a contracts package if these ever leak into responses.
type CloudflareBindings = any
type D1Database = any
