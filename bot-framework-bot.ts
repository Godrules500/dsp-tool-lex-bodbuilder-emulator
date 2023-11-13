import restify from 'restify';
import { BotFrameworkAdapter, MessageFactory } from 'botbuilder';
import axios from 'axios';
import { LexEvent } from './models/LexRequest';
import { LexDialogAction, LexV2ContentMessage, LexV2Intent, LexV2Result } from 'aws-lambda';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface Message {
    role: string;
    content: string;
}

const adapter = new BotFrameworkAdapter();

const server = restify.createServer();
server.listen(3978, () => {
    console.log(`Bot Framework bot running on http://localhost:3978`);
});

let conversationHistory: ChatCompletionMessageParam[] = [];
let conversationHistoryDevice: ChatCompletionMessageParam[] = [];
let conversationHistoryDeviceIssue: ChatCompletionMessageParam[] = [];
let conversationHistoryUserMessage: ChatCompletionMessageParam[] = [];

server.post('/api/messages', async (req, res, next) => {
    await adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded) {
            for (const member of context.activity.membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    continue;
                }
                // await context.sendActivity("Hello, how may I help you?");
                conversationHistory = [];
                conversationHistoryDevice = [];
                conversationHistoryDeviceIssue = [];
                conversationHistoryUserMessage = [];
                const lexEvent: LexEvent = {
                    inputTranscript: '',
                    sessionState: {
                        sessionAttributes: {
                            conversationHistory: JSON.stringify(conversationHistory),
                            conversationHistoryDevice: JSON.stringify(conversationHistoryDevice),
                            conversationHistoryDeviceIssue: JSON.stringify(conversationHistoryDeviceIssue),
                            conversationHistoryUserMessage: JSON.stringify(conversationHistoryUserMessage)
                        }
                    },
                    proposedNextState: {
                        dialogAction: {} as LexDialogAction,
                        intent: {} as LexV2Intent,
                        prompt: { attempt: 'Initial' }
                    }
                } as any;

                const lexResponse: LexV2Result = await mockLexLambda(lexEvent);

                if (lexResponse.sessionState.sessionAttributes?.conversationHistory) {
                    conversationHistory = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistory);
                }
                if (lexResponse.sessionState.sessionAttributes?.conversationHistoryDevice) {
                    conversationHistoryDevice = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryDevice);
                }
                if (lexResponse.sessionState.sessionAttributes?.conversationHistoryDeviceIssue) {
                  conversationHistoryDeviceIssue = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryDeviceIssue);
                }
                if (lexResponse.sessionState.sessionAttributes?.conversationHistoryUserMessage) {
                  conversationHistoryUserMessage = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryUserMessage);
                }
                if (lexResponse.messages) {
                    let answer = lexResponse.messages[0] as LexV2ContentMessage;
                    await context.sendActivity(answer.content || '');
                }
            }
        }

        if (context.activity.type === 'message') {
            const userMessage: string = context.activity.text;
            // conversationHistory.push(`User: ${userMessage}`);

            const lexEvent: LexEvent = {
                inputTranscript: userMessage,
                sessionState: {
                    sessionAttributes: {
                        conversationHistory: JSON.stringify(conversationHistory),
                        conversationHistoryDevice: JSON.stringify(conversationHistoryDevice),
                        conversationHistoryDeviceIssue: JSON.stringify(conversationHistoryDeviceIssue),
                        conversationHistoryUserMessage: JSON.stringify(conversationHistoryUserMessage)
                    }
                }
            } as any;

            const lexResponse: LexV2Result = await mockLexLambda(lexEvent);

            if (lexResponse.sessionState.sessionAttributes?.conversationHistory) {
                conversationHistory = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistory);
            }
            if (lexResponse.sessionState.sessionAttributes?.conversationHistoryDevice) {
                conversationHistoryDevice = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryDevice);
            }
            if (lexResponse.sessionState.sessionAttributes?.conversationHistoryDeviceIssue) {
              conversationHistoryDeviceIssue = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryDeviceIssue);
            }
            if (lexResponse.sessionState.sessionAttributes?.conversationHistoryUserMessage) {
              conversationHistoryUserMessage = JSON.parse(lexResponse.sessionState.sessionAttributes?.conversationHistoryUserMessage);
            }

            if (lexResponse.messages) {
                let assistantResponse = (lexResponse?.messages[0] as LexV2ContentMessage).content;
                assistantResponse = replaceLiteralNewLineWithActualNewLine(assistantResponse);
                let reply = MessageFactory.text(assistantResponse);
                await context.sendActivity(reply);
            }
        }
    });
    res.send(200);
    next();
});
function replaceLiteralNewLineWithActualNewLine(input: string): string {
    // This will replace all occurrences of the literal "\n" with an actual newline character
    return input.replace(/\\n/g, '\n');
}
async function mockLexLambda(event: any): Promise<LexV2Result> {
    try {
        const response = await axios.post('http://localhost:4000/mock-lex-lambda', event);
        return response.data;
    } catch (error) {
        console.error('Error calling mock Lex Lambda:', error);
        throw error;
    }
}
