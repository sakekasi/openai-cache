import { config } from "./config";
import { complete, embed } from "./openai";
import { makeServer } from "./serve";

export { complete, embed, makeServer };


async function main() {
    const server = makeServer();
    server.listen(config.port, () => {
        console.log(`Listening on port ${config.port}`);
    });
}
if (require.main === module) {
    main();
}