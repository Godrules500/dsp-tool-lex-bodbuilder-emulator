import { LexV2DialogAction, LexV2Event, LexV2Intent } from 'aws-lambda';

type ExtendedProposedNextState = {
    dialogAction: LexV2DialogAction;
    intent: LexV2Intent;
    prompt?: { attempt: string };
};

export interface LexEvent extends LexV2Event {
    conversationHistory?: string;
    conversationHistoryDevice?: string;
    conversationHistoryUserMessage?: string;
    // userMessage?: string;
    event?: 'INITIAL' | 'MESSAGE';
    proposedNextState: ExtendedProposedNextState;
}
