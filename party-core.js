(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PartyCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CLASSES = [
    '디스트로이어', '워로드', '버서커', '홀리나이트', '슬레이어', '발키리', '가디언나이트',
    '배틀마스터', '인파이터', '기공사', '창술사', '스트라이커', '브레이커',
    '데빌헌터', '블래스터', '호크아이', '스카우터', '건슬링어',
    '바드', '서머너', '아르카나', '소서리스',
    '블레이드', '데모닉', '리퍼', '소울이터',
    '도화가', '기상술사', '환수사', '차원술사',
  ];

  // 같은 key의 시너지는 중첩되지 않는다. 한 파티에 서로 다른 key가 많도록 배정한다.
  const SYNERGIES = {
    crit: { label: '치명타 적중률', classes: ['배틀마스터', '스트라이커', '데빌헌터', '건슬링어', '아르카나', '기상술사'] },
    critDamage: { label: '치명타 피해', classes: ['창술사', '홀리나이트', '발키리'] },
    armor: { label: '방어력 감소', classes: ['디스트로이어', '블래스터', '서머너', '리퍼', '환수사', '차원술사'] },
    attack: { label: '공격력 증가', classes: ['기공사', '스카우터', '도화가'] },
    positional: { label: '헤드/백어택 피해', classes: ['워로드', '블레이드'] },
    damage: { label: '피해 증가', classes: [
      '가디언나이트', '워로드', '버서커', '슬레이어', '인파이터', '브레이커',
      '호크아이', '소서리스', '블레이드', '데모닉', '소울이터',
    ] },
  };

  function synergyKeys(character) {
    if (!character || character.role === 'support' || !character.cls) return [];
    return Object.keys(SYNERGIES).filter(key => SYNERGIES[key].classes.includes(character.cls));
  }

  function partySynergies(party) {
    const keys = new Set();
    party.forEach(c => synergyKeys(c).forEach(key => keys.add(key)));
    return [...keys];
  }

  function combinations(items, count) {
    const result = [];
    function visit(start, picked) {
      if (picked.length === count) { result.push(picked.slice()); return; }
      for (let i = start; i <= items.length - (count - picked.length); i++) {
        picked.push(items[i]); visit(i + 1, picked); picked.pop();
      }
    }
    visit(0, []);
    return result;
  }

  function splitParties(group, size, powerOf) {
    if (size <= 4) return [group.members];
    const power = powerOf || (c => Number(c.cp) || Number(c.ilvl) || 0);
    const sups = group.members.filter(c => c.role === 'support').sort((a, b) => power(b) - power(a));
    const deals = group.members.filter(c => c.role === 'dealer');
    const p1Sup = sups.filter((_, i) => i % 2 === 0);
    const p2Sup = sups.filter((_, i) => i % 2 === 1);
    if (deals.length <= 3) return [p1Sup.concat(deals), p2Sup];

    let best = null;
    combinations(deals, Math.min(3, deals.length)).forEach(left => {
      const selected = new Set(left);
      const right = deals.filter(d => !selected.has(d));
      const p1 = p1Sup.concat(left);
      const p2 = p2Sup.concat(right);
      const diversity = partySynergies(p1).length + partySynergies(p2).length;
      const d1 = left.reduce((n, c) => n + power(c), 0);
      const d2 = right.reduce((n, c) => n + power(c), 0);
      const score = diversity * 1000000 - Math.abs(d1 - d2);
      if (!best || score > best.score) best = { score, parties: [p1, p2] };
    });
    return best.parties;
  }

  return { CLASSES, SYNERGIES, synergyKeys, partySynergies, splitParties };
}));
