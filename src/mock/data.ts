/* ========================================
   Mock 数据 — 阶段 1 UI 界面层
   所有数据均为静态演示数据
   ======================================== */

// === 卡牌工具函数 ===
export interface CardData {
  suit: 'heart' | 'diamond' | 'club' | 'spade' | 'joker';
  rank: string;
  value: number;
}

const suits: CardData['suit'][] = ['spade', 'heart', 'club', 'diamond'];
const rankList = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** 生成一副 54 张牌 */
export function createDeck(): CardData[] {
  const deck: CardData[] = [];
  for (const suit of suits) {
    for (let i = 0; i < 13; i++) {
      deck.push({ suit, rank: rankList[i], value: i + 1 });
    }
  }
  deck.push({ suit: 'joker', rank: '小王', value: 100 });
  deck.push({ suit: 'joker', rank: '大王', value: 200 });
  return deck;
}

/** 创建一副示例手牌（28张，用于展示） */
export function createMockHand(): CardData[] {
  return [
    { suit: 'spade', rank: '2', value: 2 },
    { suit: 'heart', rank: '3', value: 3 },
    { suit: 'club', rank: '4', value: 4 },
    { suit: 'diamond', rank: '5', value: 5 },
    { suit: 'spade', rank: '5', value: 5 },
    { suit: 'heart', rank: '6', value: 6 },
    { suit: 'club', rank: '6', value: 6 },
    { suit: 'diamond', rank: '7', value: 7 },
    { suit: 'spade', rank: '8', value: 8 },
    { suit: 'heart', rank: '8', value: 8 },
    { suit: 'club', rank: '9', value: 9 },
    { suit: 'diamond', rank: '9', value: 9 },
    { suit: 'spade', rank: '10', value: 10 },
    { suit: 'heart', rank: '10', value: 10 },
    { suit: 'club', rank: 'J', value: 11 },
    { suit: 'diamond', rank: 'J', value: 11 },
    { suit: 'spade', rank: 'Q', value: 12 },
    { suit: 'heart', rank: 'Q', value: 12 },
    { suit: 'club', rank: 'K', value: 13 },
    { suit: 'diamond', rank: 'K', value: 13 },
    { suit: 'spade', rank: 'A', value: 1 },
    { suit: 'heart', rank: 'A', value: 1 },
    { suit: 'club', rank: '2', value: 2 },
    { suit: 'diamond', rank: '3', value: 3 },
    { suit: 'heart', rank: '4', value: 4 },
    { suit: 'spade', rank: '7', value: 7 },
    { suit: 'heart', rank: '7', value: 7 },
    { suit: 'joker', rank: '小王', value: 100 },
  ];
}

// === 房间数据 ===
export interface MockRoom {
  id: string;
  name: string;
  type: 'practice' | 'battle';
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export const mockRooms: MockRoom[] = [
  { id: 'room-1', name: '新手练习房', type: 'practice', players: 1, maxPlayers: 4, status: 'waiting' },
  { id: 'room-2', name: '高手对决', type: 'battle', players: 3, maxPlayers: 4, status: 'waiting' },
  { id: 'room-3', name: '掼蛋争霸赛', type: 'battle', players: 4, maxPlayers: 4, status: 'playing' },
  { id: 'room-4', name: '休闲娱乐', type: 'practice', players: 2, maxPlayers: 4, status: 'waiting' },
  { id: 'room-5', name: '午后轻松局', type: 'battle', players: 4, maxPlayers: 4, status: 'finished' },
  { id: 'room-6', name: '牌王挑战', type: 'battle', players: 2, maxPlayers: 4, status: 'waiting' },
];

// === 玩家数据 ===
export interface MockPlayer {
  id: string;
  name: string;
  seat: number;
  cardCount: number;
  isOnline: boolean;
  isMe: boolean;
  isOwner: boolean;
}

export const mockPlayers: MockPlayer[] = [
  { id: 'p1', name: '牌神', seat: 0, cardCount: 20, isOnline: true, isMe: false, isOwner: true },
  { id: 'p2', name: '掼蛋高手', seat: 1, cardCount: 15, isOnline: true, isMe: false, isOwner: false },
  { id: 'p3', name: '扑克达人', seat: 2, cardCount: 10, isOnline: true, isMe: false, isOwner: false },
  { id: 'p4', name: '我', seat: 3, cardCount: 28, isOnline: true, isMe: true, isOwner: false },
];

// === 回合数据 ===
export interface MockTurn {
  turnNo: number;
  seatNo: number;
  type: 'play' | 'pass';
  cards?: CardData[];
}

export const mockRecentTurns: MockTurn[] = [
  { turnNo: 5, seatNo: 0, type: 'play', cards: [{ suit: 'diamond', rank: '5', value: 5 }] },
  { turnNo: 5, seatNo: 1, type: 'pass' },
  { turnNo: 5, seatNo: 2, type: 'pass' },
  { turnNo: 5, seatNo: 3, type: 'play', cards: [{ suit: 'spade', rank: '9', value: 9 }] },
];

// === 排行榜数据 ===
export const mockLeaderboard = [
  { rank: 1, name: '牌神', score: 9850, wins: 142, total: 200, winRate: '71%' },
  { rank: 2, name: '掼蛋高手', score: 8720, wins: 118, total: 185, winRate: '64%' },
  { rank: 3, name: '扑克达人', score: 7650, wins: 95, total: 160, winRate: '59%' },
  { rank: 4, name: '牌局新星', score: 6320, wins: 78, total: 145, winRate: '54%' },
  { rank: 5, name: '幸运之星', score: 5100, wins: 60, total: 120, winRate: '50%' },
];

// === 历史记录 ===
export const mockHistory = [
  { id: 'g1', type: 'battle', result: 'win', rank: 1, score: 85, date: '2026-04-28 14:30', roomName: '高手对决' },
  { id: 'g2', type: 'practice', result: 'win', rank: 1, score: 72, date: '2026-04-27 20:15', roomName: '练习房' },
  { id: 'g3', type: 'battle', result: 'lose', rank: 3, score: 45, date: '2026-04-26 16:00', roomName: '牌王挑战' },
  { id: 'g4', type: 'battle', result: 'win', rank: 2, score: 68, date: '2026-04-25 19:45', roomName: '休闲娱乐' },
];

// === 好友数据 ===
export const mockFriends = [
  { id: 'f1', name: '牌神', online: true, level: '王者', winRate: '71%' },
  { id: 'f2', name: '掼蛋高手', online: true, level: '大师', winRate: '64%' },
  { id: 'f3', name: '扑克达人', online: false, level: '大师', winRate: '59%' },
  { id: 'f4', name: '牌局新星', online: true, level: '钻石', winRate: '54%' },
];

// === 规则说明 ===
export const ruleSections = [
  {
    title: '基本规则',
    content: '掼蛋使用两副完整扑克牌（含大小王），共108张。四人参与，两两对坐为队友。出牌顺序为逆时针方向。每局设"级牌"（从2到A），红桃级牌具备"逢人配"属性。大王分值200，小王分值100，红桃级牌分值60，普通级牌分值50，A为14，K为13，依此类推。',
  },
  {
    title: '牌型介绍',
    content: '单张、对子、三同张、三带二（三同张+对子）、顺子（五张连续同花色，不可含王，固定5张）、连对（恰好3组连续对子，6张）、钢板（恰好2组连续三同张，6张）、炸弹（四张及以上同点数，张数多者大）、火箭/王炸（四张王牌：两大王+两小王）。',
  },
  {
    title: '炸弹分值',
    content: '王炸(10000) > 级牌炸弹(5000+级牌点数) > 普通炸弹(1000+点数)。炸弹之间先比张数（多者大），同张数再比点数。炸弹可压制所有非炸弹牌型。',
  },
  {
    title: '进贡规则',
    content: '上一局末游向头游进贡手中最大的牌（不得小于10），头游还贡一张牌（必须小于10）。头游和二游为同队时，末游向头游进贡，同时三游向二游进贡。持有双红大王（两张红桃大王）可抗贡。',
  },
  {
    title: '回合与升级',
    content: '非进贡局随机先出；进贡局由头游先出。领牌者必须出牌，不能Pass。连续3人Pass则最后出牌者获新领牌权。升级规则：头游+二游（同队）升3级，头游+三游升2级，头游+末游升1级。级牌升级不可跳过A局——到达A时必须打A局，在A局获胜方为最终胜利。',
  },
];
