// Acorn-draw oracle question presets — English re-authoring (not translation) of the Korean
// oracle/questions.ts, sized the same (6 categories x 20 questions = 120), themed for a US/EU
// audience of women late-teens to 30s: crushes/texting, career moves, friendship drama, moving
// cities, money moves, and everyday "should I..." decisions. Each question has a unique id;
// selected via UI -> passed to drawOracle.

export interface OracleQuestion {
  id: string;
  text: string;
}

export interface OracleCategory {
  id: string;
  label: string;
  emoji: string;
  questions: OracleQuestion[];
}

export const ORACLE_CATEGORIES: OracleCategory[] = [
  {
    id: 'crush',
    label: 'Crushes & Texting',
    emoji: '💌',
    questions: [
      { id: 'crush-1', text: 'Should I text them first?' },
      { id: 'crush-2', text: 'Should I say yes if they ask me out?' },
      { id: 'crush-3', text: 'Is this crush going anywhere?' },
      { id: 'crush-4', text: 'Should I slide into their DMs?' },
      { id: 'crush-5', text: "Should I double text if they left me on read?" },
      { id: 'crush-6', text: 'Is it too soon to say I like them?' },
      { id: 'crush-7', text: 'Should I give this ex another chance?' },
      { id: 'crush-8', text: 'Are they actually into me, or just being nice?' },
      { id: 'crush-9', text: 'Should I ask them to hang out one-on-one?' },
      { id: 'crush-10', text: 'Should I stop checking their story views?' },
      { id: 'crush-11', text: 'Is this the right person, or just convenient?' },
      { id: 'crush-12', text: 'Should I bring up "what are we" this week?' },
      { id: 'crush-13', text: 'Should I unmatch and move on?' },
      { id: 'crush-14', text: 'Is my situationship ever becoming official?' },
      { id: 'crush-15', text: 'Should I make the first move at the party?' },
      { id: 'crush-16', text: 'Should I tell my friend I like their ex?' },
      { id: 'crush-17', text: 'Is it worth confessing before they move away?' },
      { id: 'crush-18', text: 'Should I give dating apps another shot?' },
      { id: 'crush-19', text: 'Should I let this one go for good?' },
      { id: 'crush-20', text: 'Is now a good time to put myself back out there?' },
    ],
  },
  {
    id: 'friend',
    label: 'Friendship Drama',
    emoji: '👯',
    questions: [
      { id: 'friend-1', text: 'Should I address the group chat tension?' },
      { id: 'friend-2', text: 'Is this friendship worth saving?' },
      { id: 'friend-3', text: 'Should I bring up feeling left out?' },
      { id: 'friend-4', text: 'Should I forgive them for canceling again?' },
      { id: 'friend-5', text: 'Is it time to set a real boundary with them?' },
      { id: 'friend-6', text: 'Should I confront my friend about the rumor?' },
      { id: 'friend-7', text: "Should I invite the friend everyone's avoiding?" },
      { id: 'friend-8', text: 'Is this the season to drift apart from them?' },
      { id: 'friend-9', text: "Should I apologize first, even if I wasn't wrong?" },
      { id: 'friend-10', text: 'Should I say something about the passive-aggressive texts?' },
      { id: 'friend-11', text: 'Is my friend group actually good for me right now?' },
      { id: 'friend-12', text: 'Should I plan the trip even if half the group flakes?' },
      { id: 'friend-13', text: "Should I tell them their partner is bad news?" },
      { id: 'friend-14', text: 'Is it worth patching things up before the wedding?' },
      { id: 'friend-15', text: 'Should I make new friends instead of forcing old ones?' },
      { id: 'friend-16', text: 'Should I call out favoritism in the friend group?' },
      { id: 'friend-17', text: 'Is this a friendship or just a habit at this point?' },
      { id: 'friend-18', text: 'Should I go no-contact with them for a while?' },
      { id: 'friend-19', text: 'Should I be honest about how their move made me feel?' },
      { id: 'friend-20', text: 'Is this the year to widen my circle?' },
    ],
  },
  {
    id: 'career',
    label: 'Career Moves',
    emoji: '💼',
    questions: [
      { id: 'career-1', text: 'Should I ask for a raise this quarter?' },
      { id: 'career-2', text: 'Is it time to start job hunting?' },
      { id: 'career-3', text: "Should I take the new role even if it's a lateral move?" },
      { id: 'career-4', text: 'Should I speak up in the next big meeting?' },
      { id: 'career-5', text: 'Is this the year to go freelance?' },
      { id: 'career-6', text: 'Should I take the risk and start something of my own?' },
      { id: 'career-7', text: 'Should I say yes to the relocation offer?' },
      { id: 'career-8', text: 'Is my current job actually going anywhere?' },
      { id: 'career-9', text: 'Should I go back to school for this?' },
      { id: 'career-10', text: 'Should I take the pay cut for better hours?' },
      { id: 'career-11', text: 'Is it time to set boundaries with my manager?' },
      { id: 'career-12', text: "Should I apply even though I don't check every box?" },
      { id: 'career-13', text: 'Should I stay another year for the experience?' },
      { id: 'career-14', text: 'Is this the moment to pitch my idea?' },
      { id: 'career-15', text: 'Should I take the promotion even if it means more stress?' },
      { id: 'career-16', text: 'Should I quit without a backup plan?' },
      { id: 'career-17', text: 'Is now the time to build my personal brand?' },
      { id: 'career-18', text: "Should I take the interview even if I'm not sure I'd leave?" },
      { id: 'career-19', text: 'Should I ask to work remotely?' },
      { id: 'career-20', text: 'Is this the year my career finally clicks into place?' },
    ],
  },
  {
    id: 'moving',
    label: 'Moving & New Places',
    emoji: '🧳',
    questions: [
      { id: 'moving-1', text: 'Should I move to a new city this year?' },
      { id: 'moving-2', text: 'Is it time to finally leave this apartment?' },
      { id: 'moving-3', text: 'Should I move in with my partner?' },
      { id: 'moving-4', text: "Should I take the leap and move somewhere I don't know anyone?" },
      { id: 'moving-5', text: 'Is it worth moving back home for a while?' },
      { id: 'moving-6', text: 'Should I sign the lease on the place I saw?' },
      { id: 'moving-7', text: 'Should I move for the relationship?' },
      { id: 'moving-8', text: 'Is this the season to downsize?' },
      { id: 'moving-9', text: 'Should I get a roommate to make the move work?' },
      { id: 'moving-10', text: 'Should I move somewhere warmer for a fresh start?' },
      { id: 'moving-11', text: 'Is it too soon to move in together?' },
      { id: 'moving-12', text: 'Should I take the leap and move abroad?' },
      { id: 'moving-13', text: 'Should I stay put and fix up where I already live?' },
      { id: 'moving-14', text: 'Is this the year I finally get my own place?' },
      { id: 'moving-15', text: 'Should I move closer to family?' },
      { id: 'moving-16', text: 'Should I move farther from family?' },
      { id: 'moving-17', text: 'Is it worth the commute for the cheaper rent?' },
      { id: 'moving-18', text: 'Should I move in with these roommates?' },
      { id: 'moving-19', text: 'Should I hold off on moving until things settle?' },
      { id: 'moving-20', text: 'Is this the right neighborhood for my next chapter?' },
    ],
  },
  {
    id: 'money',
    label: 'Money Moves',
    emoji: '🪙',
    questions: [
      { id: 'money-1', text: 'Should I start investing this year?' },
      { id: 'money-2', text: 'Is it a good time to make a big purchase?' },
      { id: 'money-3', text: 'Should I lend them money?' },
      { id: 'money-4', text: 'Should I take on a side hustle?' },
      { id: 'money-5', text: 'Is this the year I finally save something real?' },
      { id: 'money-6', text: "Should I splurge on the thing I've been eyeing?" },
      { id: 'money-7', text: 'Should I ask for help with this expense?' },
      { id: 'money-8', text: 'Is it worth the risk on this investment?' },
      { id: 'money-9', text: 'Should I pay off debt before saving?' },
      { id: 'money-10', text: "Should I open that account I've been putting off?" },
      { id: 'money-11', text: 'Is now a good time to negotiate this deal?' },
      { id: 'money-12', text: "Should I sell the thing I've been holding onto?" },
      { id: 'money-13', text: 'Should I combine finances with my partner?' },
      { id: 'money-14', text: 'Is this the year money finally feels easier?' },
      { id: 'money-15', text: 'Should I cut back on spending for a while?' },
      { id: 'money-16', text: 'Should I take the financial risk on this idea?' },
      { id: 'money-17', text: 'Is it smart to co-sign for them?' },
      { id: 'money-18', text: 'Should I build an emergency fund before anything else?' },
      { id: 'money-19', text: 'Should I trust this opportunity with my money?' },
      { id: 'money-20', text: 'Is this a season to be cautious or bold with money?' },
    ],
  },
  {
    id: 'choice',
    label: 'Should-I Decisions',
    emoji: '🌀',
    questions: [
      { id: 'choice-1', text: "Should I say yes to this even though I'm scared?" },
      { id: 'choice-2', text: 'Is now the right time for a big change?' },
      { id: 'choice-3', text: 'Should I trust my gut on this one?' },
      { id: 'choice-4', text: 'Should I take the leap or wait it out?' },
      { id: 'choice-5', text: 'Is this the year everything shifts for me?' },
      { id: 'choice-6', text: 'Should I let this go, or keep pushing?' },
      { id: 'choice-7', text: 'Should I say no for once?' },
      { id: 'choice-8', text: "Is it time to try the thing I've been putting off?" },
      { id: 'choice-9', text: 'Should I ask for what I actually want?' },
      { id: 'choice-10', text: 'Is this a season to rest or to push forward?' },
      { id: 'choice-11', text: 'Should I follow through on the plan I made?' },
      { id: 'choice-12', text: 'Should I change my mind, even this late?' },
      { id: 'choice-13', text: 'Is it worth starting over?' },
      { id: 'choice-14', text: 'Should I speak up about how I really feel?' },
      { id: 'choice-15', text: 'Should I give this one more try?' },
      { id: 'choice-16', text: "Is this the sign I've been waiting for?" },
      { id: 'choice-17', text: 'Should I slow down instead of rushing this?' },
      { id: 'choice-18', text: 'Should I trust this new opportunity?' },
      { id: 'choice-19', text: 'Is it finally time to let this chapter close?' },
      { id: 'choice-20', text: 'Should I go all in on this?' },
    ],
  },
];

const QUESTION_INDEX: Map<string, OracleQuestion> = new Map(
  ORACLE_CATEGORIES.flatMap((c) => c.questions.map((q) => [q.id, q] as const)),
);

/** Look up a question by id. Undefined if not found. */
export function findQuestion(id: string): OracleQuestion | undefined {
  return QUESTION_INDEX.get(id);
}
