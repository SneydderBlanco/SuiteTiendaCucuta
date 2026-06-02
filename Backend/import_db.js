const fs = require('fs');
const path = require('path');
const db = require('./db');

async function run() {
    const sqlPath = path.join(__dirname, 'database', 'database_backup.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`No se encontró el archivo de backup en: ${sqlPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const lines = sql.split('\n');
    let processedSql = [];
    let inCopy = false;
    let copyTable = '';
    let copyCols = '';
    let copyRows = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Ignorar líneas de control específicas de pg_dump o slash commands
        if (line.trim().startsWith('\\')) {
            if (line.trim() === '\\.') {
                inCopy = false;
                if (copyRows.length > 0) {
                    const insertStmt = `INSERT INTO ${copyTable} (${copyCols}) VALUES \n` + 
                        copyRows.map(row => {
                            const vals = row.split('\t').map(v => {
                                if (v === '\\N' || v === 'NULL' || v === '') return 'NULL';
                                // Escapar comillas simples para Postgres
                                return "'" + v.replace(/'/g, "''") + "'";
                            }).join(', ');
                            return `(${vals})`;
                        }).join(',\n') + ';';
                    processedSql.push(insertStmt);
                }
            }
            continue;
        }

        // Ignorar cambios de dueño (OWNER TO), ya que en Neon el usuario es neondb_owner y no postgres
        if (line.toUpperCase().includes('OWNER TO')) {
            continue;
        }

        if (line.trim().toUpperCase().startsWith('COPY ')) {
            // Formato: COPY public.tablename (col1, col2) FROM stdin;
            const match = line.match(/COPY\s+([\w\._"]+)\s*\(([^)]+)\)\s*FROM\s+stdin;/i);
            if (match) {
                inCopy = true;
                copyTable = match[1];
                copyCols = match[2];
                copyRows = [];
                continue;
            }
        }

        if (inCopy) {
            // Guardamos la fila si no está vacía
            if (line.trim() !== '') {
                copyRows.push(line);
            }
            continue;
        }

        processedSql.push(line);
    }

    const finalSql = processedSql.join('\n');

    console.log("Iniciando restauración de base de datos en Neon...");
    
    try {
        // Ejecutamos todo el bloque de SQL
        await db.query(finalSql);
        console.log("¡Base de datos restaurada con éxito en Neon!");
    } catch (err) {
        console.error("Error durante la restauración de la base de datos:", err);
    }
    process.exit(0);
}

run();
