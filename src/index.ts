import { config } from "./config";
import { complete, embed } from "./openai";
import { serve } from "./serve";

export { complete, embed, serve };


async function main() {
    serve(config.port)
    // console.log('Hello World!');
    // const completion = await complete('text-ada-001', 'console.log("hello', {
    //     maxTokens: 10
    // });
    // console.log('prompt: "', 'console.log("hello', '"');
    // console.log('completion: "', completion.choices[0].text, '"');
    
    // const embeddings = await embed('text-embedding-ada-002', ['Hello']);
    // console.log('input: "', 'Hello', '"');
    // console.log('embedding: "', embeddings[0].embedding, '"');

}
if (require.main === module) {
    main();
}