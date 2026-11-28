const find = id => document.getElementById(id);
const login = find('login');
const character = find('character');
const item = find('item');
const operation = find('operation');
const upgrade = find('upgrade');
const status = find('status');
const errors = {
  unauthorized: 'Sesja wygasła. Zaloguj się ponownie.',
  invalid_credentials: 'Sprawdź login i hasło.',
  insufficient_gold: 'Brakuje złota.',
  insufficient_materials: 'Brakuje materiałów.',
  quote_changed: 'Warunki próby się zmieniły. Sprawdź nowy koszt.',
  upgrade_unavailable: 'Ulepszanie tego przedmiotu jest niedostępne.',
  not_found: 'Postać lub przedmiot są niedostępne.',
  rate_limited: 'Odczekaj minutę przed następną próbą logowania.'
};
let token, view, pending, busy = false;
const endpoint = () => '/api/v1/characters/' + character.value + '/' + operation.value;
const qualityMode = () => operation.value === 'quality';
const qualityNames = {common:'Pospolity',uncommon:'Zwyczajny',rare:'Rzadki',epic:'Epicki',legendary:'Legendarny'};
const selection = () => view?.items.find(entry => entry.id === item.value);
const number = new Intl.NumberFormat('pl-PL');

async function request(path, method = 'GET', data) {
  const headers = token ? {Authorization: 'Bearer ' + token} : {};
  if (data) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {method, headers, body: data ? JSON.stringify(data) : undefined});
  const payload = await response.json();
  if (!response.ok) throw Object.assign(Error(errors[payload.error] ?? 'Serwer nie mógł wykonać operacji.'), {status: response.status});
  return payload;
}

function text(tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
}

function render() {
  const entry = selection();
  const area = find('quote');
  area.replaceChildren();
  character.disabled = busy || Boolean(pending) || !character.options.length;
  operation.disabled = busy || Boolean(pending);
  item.disabled = busy || Boolean(pending) || !view?.items.length;
  upgrade.textContent = pending ? 'Sprawdź wynik próby' : qualityMode() ? 'Podnieś jakość' : 'Ulepsz przedmiot';
  upgrade.disabled = busy || !entry || (!pending && ((!qualityMode() && !view.smithRank) || BigInt(view.gold) < BigInt(entry.quote.gold) ||
    entry.materials.some(material => BigInt(material.available) < BigInt(material.count))));
  if (!entry) return;
  const {quote, materials} = entry;
  const target = qualityMode() ? (qualityNames[quote.qualityId] ?? quote.qualityId) :
    entry.targetName ? entry.targetName + ' +0' : entry.name + ' +' + (entry.level + 1);
  area.append(text('p', target +
    ' · ' + number.format(quote.chance) + '% szansy'), text('p', 'Koszt złota: ' + number.format(quote.gold)));
  if (materials.length) {
    const list = document.createElement('ul');
    for (const material of materials) list.append(text('li', material.name + ' — ' +
      number.format(material.count) + ' z ' + number.format(BigInt(material.available)) + ' dostępnych'));
    area.append(list);
  }
}

async function refresh() {
  const previous = item.value;
  view = character.value ? await request(endpoint()) : {items: [], gold: '0', smithRank: 0};
  item.replaceChildren(...view.items.map(entry => new Option(entry.name + ' +' + entry.level +
    (qualityMode() ? ' · ' + (qualityNames[entry.qualityId] ?? entry.qualityId) : ''), entry.id)));
  if (view.items.some(entry => entry.id === previous)) item.value = previous;
  find('gold').textContent = 'Złoto: ' + number.format(BigInt(view.gold));
  find('rank').textContent = qualityMode() ? '' :
    view.smithRank ? 'Podstawowe kowalstwo: ' + view.smithRank : 'Wymagana umiejętność Podstawowe kowalstwo.';
  const profession = view.profession;
  find('profession').textContent = profession ? 'Profesja kowalstwa · poziom ' + profession.level +
    (profession.needed ? ' · ' + number.format(profession.experience) + ' / ' + number.format(profession.needed) + ' EXP' : ' · maksymalny poziom') +
    (profession.upgradeBonus ? ' · +' + profession.upgradeBonus + ' pkt proc. do szansy ulepszenia' : '') : '';
}

function reset() {
  token = view = pending = undefined;
  find('smith').hidden = true;
  login.hidden = false;
  login.reset();
}

async function run(action) {
  if (busy) return;
  busy = true;
  status.textContent = '';
  login.querySelector('button').disabled = true;
  render();
  try { await action(); }
  catch (error) {
    if (error.status === 401 && token) reset();
    status.textContent = error.status ? error.message : 'Brak odpowiedzi serwera. Spróbuj ponownie.';
  } finally {
    busy = false;
    login.querySelector('button').disabled = false;
    render();
  }
}

login.addEventListener('submit', event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(login));
  run(async () => {
    ({token} = await request('/api/v1/auth/login', 'POST', body));
    login.reset();
    const characters = await request('/api/v1/characters');
    character.replaceChildren(...characters.map(entry => new Option(entry.name, entry.id)));
    await refresh();
    login.hidden = true;
    find('smith').hidden = false;
    if (!characters.length) status.textContent = 'Na tym koncie nie ma jeszcze postaci Engine v2.';
    else if (!view.items.length) status.textContent = 'Brak przedmiotów do ulepszenia w plecaku.';
  });
});
const refreshSelection = () => run(async () => {
  view = undefined;
  await refresh();
  if (!view.items.length) status.textContent = 'Brak przedmiotów do ulepszenia w plecaku.';
});
character.addEventListener('change', refreshSelection);
operation.addEventListener('change', refreshSelection);
item.addEventListener('change', render);
upgrade.addEventListener('click', () => run(async () => {
  const entry = selection();
  pending ??= {itemId: entry.id, operationId: crypto.randomUUID(), expectedQuote: entry.quoteKey};
  let outcome;
  try { outcome = await request(endpoint(), 'POST', pending); }
  catch (error) {
    if (error.status && error.status < 500) {
      pending = undefined;
      if (error.status === 409 || error.status === 404) await refresh();
    }
    throw error;
  }
  pending = undefined;
  view = undefined;
  const result = (outcome.success ? qualityMode() ?
    'Nowa jakość: ' + (qualityNames[outcome.qualityId] ?? outcome.qualityId) + '.' :
    'Ulepszenie udane. Poziom +' + outcome.level + '.' :
    'Próba nieudana. Koszt został pobrany.') +
    (outcome.experienceGained ? ' +' + outcome.experienceGained + ' EXP kowalstwa.' : '');
  try { await refresh(); status.textContent = result; }
  catch { status.textContent = result + ' Nie udało się odświeżyć plecaka.'; }
}));
find('logout').addEventListener('click', () => run(async () => {
  await request('/api/v1/auth/logout', 'POST');
  reset();
}));
