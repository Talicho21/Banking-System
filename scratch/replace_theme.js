const fs = require('fs');
const path = require('path');
const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') && (f.startsWith('Admin') || f.startsWith('Registration')));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('const isDark = theme === \"dark\";')) {
    // Add import if not exists
    if (!content.includes('next-themes')) {
      content = content.replace('\"use client\";', '\"use client\";\n\nimport { useTheme } from \"next-themes\";');
    }
    
    // Replace isDark definition
    content = content.replace('const isDark = theme === \"dark\";', 'const { theme: nextTheme } = useTheme();\n  const isDark = nextTheme !== \"light\";');
    
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  }
}
