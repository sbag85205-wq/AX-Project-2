export const normalizePersonality=value=>value==='warm'?'warm':'cold';
export const personalities={
 cold:{label:'차가운 모드',greeting:'궁금한 게 있어?',intro:'자료는 내가 찾아볼게. 질문부터 해 봐.',unknown:'받은 자료에는 없다냥.',unknownDetail:'이건 나도 아는 척 못 해. 다른 질문을 골라보거나 담당자에게 확인해 봐.',scope:'그건 다른 분야의 질문이다냥.',schedule:'날짜만 알려 줘. 내가 챙겨 둘게.',feed:'츄르라니… 너, 제법이다냥.',feedDetail:'기분 좋아진 건 비밀. 주변 하트도 챙겨 가.',heart:'하트도 챙겼네. 잘 써 보라냥.',heartDetail:'모은 하트로 나를 꾸며 줘. 조금은 기대하고 있어.',like:['조금만 더 해도 돼.','…좋아서 이러는 건 아니고.'],dislike:['지금은 혼자 있을래.','손은 여기까지다냥.'],bonus:['너, 제법 마음에 든다냥.','꼬리가 먼저 말해 버렸네.']},
 warm:{label:'따뜻한 모드',greeting:'오늘도 반가워요!',intro:'궁금한 일이 있으면 편하게 물어봐요. 함께 찾아볼게요.',unknown:'자료에서 답을 찾지 못했어요.',unknownDetail:'정확하지 않은 답을 드릴 수는 없어요. 다른 질문을 해 보거나 담당자에게 확인해 주세요.',scope:'다른 분야의 자료를 확인해야겠어요.',schedule:'날짜를 알려 주시면 함께 일정을 챙겨 볼게요.',feed:'고마워요! 정말 맛있다냥.',feedDetail:'덕분에 기분이 좋아졌어요. 주변 하트도 챙겨 주세요!',heart:'하트까지 챙겨 주셨네요!',heartDetail:'모은 하트로 저를 꾸며 주세요. 기대하고 있을게요.',like:['쓰다듬어 주니 기분 좋다냥.','따뜻한 손길, 고마워요!'],dislike:['지금은 잠깐 쉬고 싶어요. 조금 뒤에 만나요.','조금만 쉬고 다시 놀아 줄게요.'],bonus:['덕분에 행복하다냥. 작은 선물이에요!','반가워서 꼬리가 절로 움직여요!']}
};
// Apply only to authored chatbot copy. Source excerpts and user text stay verbatim.
const warmEndings=[['하면 돼.','하면 돼요.'],['받으면 돼.','받으면 돼요.'],['신청해.','신청해 주세요.'],['준비해.','준비해 주세요.'],['확인해.','확인해 주세요.'],['챙겨.','챙겨 주세요.'],['수령해.','수령해 주세요.'],['제출해.','제출해 주세요.'],['참여해.','참여해 주세요.'],['제외해.','제외해요.'],['받아.','받아 주세요.'],['보관해.','보관해 주세요.'],['필요해.','필요해요.'],['요청해.','요청해 주세요.']];
const coldEndings=[['전달해 주세요.','전달해 줘.'],['받으세요.','받아.'],['잊지 마세요.','잊지 마.'],['하세요.','해.'],['있습니다.','있어.'],['않습니다.','않아.'],['합니다.','해.'],['있어요.','있어.'],['이에요.','이야.'],['예요.','야.'],['돼요.','돼.'],['해요.','해.']];
export function personalityText(text,mode){
 return (normalizePersonality(mode)==='warm'?warmEndings:coldEndings).reduce((copy,[from,to])=>copy.replaceAll(from,to),text);
}
export function personalityAnswer(answer,mode){
 return {...answer,title:personalityText(answer.title,mode),text:personalityText(answer.text,mode),...(answer.steps?{steps:answer.steps.map(step=>personalityText(step,mode))}:{})};
}

// Presentation only: the server still decides all reactions and rewards.
export function petAppearance(mode,{reaction=null,happy=false,mood=''}={}){
 const warm=normalizePersonality(mode)==='warm';
 const expression=reaction==='dislike'?(warm?'':'annoyed'):reaction==='bonus'?'happy':reaction==='like'?(warm?'happy':''):happy?'happy':mood;
 return {expression,wag:reaction==='bonus'||warm&&expression==='happy'};
}
