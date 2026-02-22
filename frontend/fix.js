const fs = require('fs');
const filepath = 'd:/tmp/smart grievance/frontend/department_dashboard.html';
let content = fs.readFileSync(filepath, 'utf8');

// The formatter broke interpolations like: 
// $ {
//     var
// }
// We match $ followed by spaces/newlines, {, contents, }
content = content.replace(/\$\s*\{([^}]+)\}/g, (match, inner) => {
    return '${' + inner.trim() + '}';
});

fs.writeFileSync(filepath, content);
console.log("Fix complete.");
