/**
 * Dummy data for the Flexdatalist examples page.
 * Everything is generated locally: no external images or services.
 */

const FRUITS = [
    { id: 1,  label: 'Apple',      color: 'Red',    category: 'Pome' },
    { id: 2,  label: 'Banana',     color: 'Yellow', category: 'Tropical' },
    { id: 3,  label: 'Cherry',     color: 'Red',    category: 'Stone' },
    { id: 4,  label: 'Grape',      color: 'Purple', category: 'Berry' },
    { id: 5,  label: 'Kiwi',       color: 'Green',  category: 'Tropical' },
    { id: 6,  label: 'Lemon',      color: 'Yellow', category: 'Citrus' },
    { id: 7,  label: 'Mango',      color: 'Orange', category: 'Tropical' },
    { id: 8,  label: 'Orange',     color: 'Orange', category: 'Citrus' },
    { id: 9,  label: 'Peach',      color: 'Orange', category: 'Stone' },
    { id: 10, label: 'Pear',       color: 'Green',  category: 'Pome' },
    { id: 11, label: 'Pineapple',  color: 'Yellow', category: 'Tropical' },
    { id: 12, label: 'Plum',       color: 'Purple', category: 'Stone' },
    { id: 13, label: 'Raspberry',  color: 'Red',    category: 'Berry' },
    { id: 14, label: 'Strawberry', color: 'Red',    category: 'Berry' },
    { id: 15, label: 'Watermelon', color: 'Green',  category: 'Melon' },
];

/** Round SVG avatar with the person's initials, as a data URI. */
function makeAvatar(name, backgroundColor) {
    const initials = name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">`
        + `<circle cx="32" cy="32" r="32" fill="${backgroundColor}"/>`
        + `<text x="32" y="41" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#fff" text-anchor="middle">${initials}</text>`
        + `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const PEOPLE = [
    { id: 101, name: 'Ana Ribeiro',     email: 'ana.ribeiro@example.com',     team: 'Design',      color: '#db2777' },
    { id: 102, name: 'Bruno Costa',     email: 'bruno.costa@example.com',     team: 'Engineering', color: '#2563eb' },
    { id: 103, name: 'Carla Mendes',    email: 'carla.mendes@example.com',    team: 'Engineering', color: '#059669' },
    { id: 104, name: 'David Almeida',   email: 'david.almeida@example.com',   team: 'Sales',       color: '#d97706' },
    { id: 105, name: 'Eva Martins',     email: 'eva.martins@example.com',     team: 'Design',      color: '#7c3aed' },
    { id: 106, name: 'Filipe Sousa',    email: 'filipe.sousa@example.com',    team: 'Support',     color: '#0891b2' },
    { id: 107, name: 'Gabriela Lopes',  email: 'gabriela.lopes@example.com',  team: 'Sales',       color: '#dc2626' },
    { id: 108, name: 'Hugo Pereira',    email: 'hugo.pereira@example.com',    team: 'Engineering', color: '#4f46e5' },
    { id: 109, name: 'Inês Carvalho',   email: 'ines.carvalho@example.com',   team: 'Support',     color: '#65a30d' },
    { id: 110, name: 'João Fernandes',  email: 'joao.fernandes@example.com',  team: 'Engineering', color: '#0d9488' },
].map(person => ({ ...person, thumb: makeAvatar(person.name, person.color) }));

/** Mixed records for grouped results ("People", "Tasks", "Pages"). */
const WORKSPACE_ITEMS = [
    ...PEOPLE.slice(0, 5).map(person => ({ id: `person-${person.id}`, title: person.name, detail: person.team, type: 'People' })),
    { id: 'task-1', title: 'Prepare quarterly report',  detail: 'Due Friday',      type: 'Tasks' },
    { id: 'task-2', title: 'Review pull requests',      detail: 'Engineering',     type: 'Tasks' },
    { id: 'task-3', title: 'Plan design sprint',        detail: 'Design',          type: 'Tasks' },
    { id: 'task-4', title: 'Reply to support tickets',  detail: '12 open',         type: 'Tasks' },
    { id: 'page-1', title: 'Pricing',                   detail: '/pricing',        type: 'Pages' },
    { id: 'page-2', title: 'Privacy policy',            detail: '/privacy',        type: 'Pages' },
    { id: 'page-3', title: 'Product roadmap',           detail: '/roadmap',        type: 'Pages' },
];

/** Items whose text contains HTML: it must be shown as text, never executed. */
const UNSAFE_ITEMS = [
    { id: 1, label: '<img src=x onerror="window.__xssTriggered = true">Image tag' },
    { id: 2, label: '<b>Bold</b> & "quoted" text' },
    { id: 3, label: '<script>window.__xssTriggered = true</script>Script tag' },
];

const ACCENTED_WORDS = [
    { id: 1, label: 'França' },
    { id: 2, label: 'España' },
    { id: 3, label: 'Ångström' },
    { id: 4, label: 'Crêpe' },
    { id: 5, label: 'Naïve' },
    { id: 6, label: 'Zürich' },
];

/** Animated spinner for `resultsLoader`, as a data URI. */
const SPINNER_IMAGE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    + '<circle cx="12" cy="12" r="9" fill="none" stroke="#c7d2fe" stroke-width="3"/>'
    + '<path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round">'
    + '<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>'
    + '</path></svg>'
);
