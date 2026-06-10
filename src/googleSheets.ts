import { Book } from './types';

/**
 * Extracts the 44-character Google Spreadsheet ID from a link.
 */
export function extractSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Generates the clean direct CSV export link from a sheet ID.
 */
export function getCSVExportUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

/**
 * Robust CSV parser that handles double-quoted cells, linebreaks inside quotes,
 * dynamically detects comma vs semicolon separators, and automatically skips
 * meta/title rows to locate the actual column headers.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  
  // Custom splitting that PRESERVES double quotes inside lines so that parseLine
  // can properly handle cells with commas enclosed inside quotes without offset.
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += '"';
    } else if (char === '\n' || char === '\r') {
      if (inQuotes) {
        currentLine += char;
      } else {
        if (char === '\r' && csvText[i + 1] === '\n') {
          i++;
        }
        lines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) return [];
  
  // Find whether comma or semicolon is more frequent overall in the first 1000 characters
  const sample = csvText.slice(0, 1000);
  let commaCount = 0;
  let semiCount = 0;
  let inQList = false;
  for (const c of sample) {
    if (c === '"') inQList = !inQList;
    if (!inQList) {
      if (c === ',') commaCount++;
      if (c === ';') semiCount++;
    }
  }
  const separator = semiCount > commaCount ? ';' : ',';
  
  // Split line respecting double quotes
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ; // Toggle inQ but do not include the quotes in field output
      } else if (c === separator && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };
  
  // Dynamically detect the actual header row (some sheets have an empty row or title row at the top)
  // Ensure we find a row containing at least 2 valid keywords to avoid false positives.
  let headerRowIndex = 0;
  let headers: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const parsedRow = parseLine(lines[i]);
    let matchCount = 0;
    parsedRow.forEach(cell => {
      const cleanCell = cell.toLowerCase().trim();
      const hasKeyword = cleanCell === 'titulo' || 
                         cleanCell === 'título' || 
                         cleanCell === 'title' || 
                         cleanCell === 'libro' || 
                         cleanCell === 'codigo' || 
                         cleanCell === 'código' || 
                         cleanCell === 'code' || 
                         cleanCell === 'autor' || 
                         cleanCell === 'author' ||
                         cleanCell === 'precio' ||
                         cleanCell === 'price' ||
                         cleanCell === 'stock' ||
                         cleanCell === 'categoria' ||
                         cleanCell === 'categoría';
      if (hasKeyword) {
        matchCount++;
      }
    });
    
    if (matchCount >= 2) {
      headerRowIndex = i;
      headers = parsedRow;
      break;
    }
  }
  
  // Default to first row if none matched (should rarely happen)
  if (headers.length === 0) {
    headers = parseLine(lines[0] || '');
    headerRowIndex = 0;
  }
  
  const result: Record<string, string>[] = [];
  
  // Process only rows below the detected headers row
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = values[index] || '';
      }
    });
    result.push(rowObj);
  }
  
  return result;
}

/**
 * Intelligent mapper from arbitrary sheet row records into clean typed Book structures.
 */
export function mapRowsToBooks(rows: Record<string, string>[]): Book[] {
  return rows.map((row, index) => {
    let id_val = '';
    let title_val = '';
    let author_val = 'Anónimo';
    let category_val = 'General';
    let description_val = '';
    let stock_val = 10;
    let price_val = 0;
    let coverImage_val = '';
    let discountType_val: 'percentage' | 'fixed' | 'none' = 'none';
    let discountValue_val = 0;
    let visible_val = true;

    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase().trim();
      // Remove any leading special symbols, pound markers (#), list bullets, emojis 
      const kClean = k.replace(/^[^a-z0-9áéíóúüñ]+/gi, '').trim();
      const v = val.trim();
      
      if (/^(id|código|codigo|code)$/.test(kClean)) {
        id_val = v;
      } else if (/^(título|titulo|libro|nombre|title)$/.test(kClean)) {
        title_val = v;
      } else if (/^(autor|author|creador|escritor)$/.test(kClean)) {
        author_val = v || 'Anónimo';
      } else if (/^(categoría|categoria|category|sección|seccion|clase)$/.test(kClean)) {
        category_val = v || 'General';
      } else if (/^(descripción|descripcion|detalle|sipnosis|description|resumen)$/.test(kClean)) {
        description_val = v;
      } else if (/^(stock|inventario|cantidad|unidades|disponibles|cantidad disponible)$/.test(kClean)) {
        const parsed = parseInt(v, 10);
        stock_val = isNaN(parsed) ? 10 : parsed;
      } else if (/^(precio|price|valor|costo)$/.test(kClean)) {
        // Clean currency signs, blanks, replace comma with dot for decimals
        const cleaned = v.replace('$', '').replace(/\s/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        price_val = isNaN(parsed) ? 0 : parsed;
      } else if (/^(imagen portada|imagen|portada|cover|image|coverimage|foto)$/.test(kClean)) {
        // Validate URL or base64 to avoid text labels from appearing in img src
        if (v.startsWith('http') || v.startsWith('data:')) {
          coverImage_val = v;
        } else {
          coverImage_val = '';
        }
      } else if (/^(descuento tipo|discount type|tipo descuento)$/.test(kClean)) {
        const lowerVal = v.toLowerCase();
        if (lowerVal.includes('porcentaje') || lowerVal.includes('%') || lowerVal.includes('percentage') || lowerVal.includes('pc')) {
          discountType_val = 'percentage';
        } else if (lowerVal.includes('fijo') || lowerVal.includes('fixed') || lowerVal.includes('valor') || lowerVal.includes('monto')) {
          discountType_val = 'fixed';
        } else {
          discountType_val = 'none';
        }
      } else if (/^(descuento valor|discount value|valor descuento|monto descuento)$/.test(kClean)) {
        const cleaned = v.replace('$', '').replace(/\s/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        discountValue_val = isNaN(parsed) ? 0 : parsed;
      } else if (/^(visible|activo|mostrar)$/.test(kClean)) {
        const lowerVal = v.toLowerCase();
        visible_val = !(lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0' || lowerVal === 'oculto');
      }
    }

    // Generate readable ID from title if missing
    if (!id_val) {
      if (title_val) {
        id_val = `book-${title_val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
      } else {
        id_val = `book-row-${index + 1}`;
      }
    }

    // Variety of elegant covers to complement the beautiful Natural theme
    const coverColors = [
      'from-[#7D6E50] to-[#5F5338] border-[#A89A7B]',
      'from-[#5F6F52] to-[#45523A] border-[#889C79]',
      'from-[#3D3D33] to-[#25251F] border-[#666657]',
      'from-[#A67B5B] to-[#785437] border-[#CBA386]',
      'from-[#827D6C] to-[#5A564A] border-[#ADA795]',
      'from-[#556B2F] to-[#39491F] border-[#819D55]',
      'from-[#8F7D66] to-[#61513D] border-[#B9A68F]',
      'from-[#4A5D4E] to-[#313E34] border-[#728B77]',
    ];
    const coverColor = coverColors[index % coverColors.length];

    return {
      id: id_val,
      title: title_val || `Libro s/n ${index + 1}`,
      author: author_val,
      category: category_val,
      description: description_val,
      coverColor,
      stock: stock_val,
      initialStock: stock_val,
      price: price_val,
      visible: visible_val,
      coverImage: coverImage_val || '',
      discountType: discountType_val,
      discountValue: discountValue_val,
    };
  });
}

/**
 * Executes the complete request and import flow from a public sheets URL.
 */
export async function fetchBooksFromSheet(url: string): Promise<Book[]> {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error('El enlace provisto no parece ser una URL válida de Google Sheets. Ej: https://docs.google.com/spreadsheets/d/...');
  }
  
  const csvUrl = getCSVExportUrl(sheetId);
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Error al descargar la hoja de cálculo. Asegúrate de configurar acceso público ('Cualquier persona con el enlace puede ver'). Código de error HTTP ${response.status}`);
  }
  
  const csvText = await response.text();
  const cleanText = csvText.trim();
  
  // Safety Guard: Detect if Google returned an HTML login or error page instead of CSV
  if (cleanText.toLowerCase().startsWith('<!doctype') || cleanText.toLowerCase().includes('<html')) {
    throw new Error('El enlace de Google Sheets no es accesible públicamente. Encontramos una respuesta HTML. Por favor, asegúrate de compartir el documento como "Cualquier persona con el enlace puede ver como Lector".');
  }

  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    throw new Error('La hoja de cálculo está vacía o no tiene cabeceras legibles.');
  }
  
  const parsedBooks = mapRowsToBooks(rows);
  
  // Safety Guard: Detect if sheets headers did not align at all (e.g. 100% anonymous titles)
  const anonymousBooksCount = parsedBooks.filter(b => b.title.startsWith('Libro s/n')).length;
  if (anonymousBooksCount === parsedBooks.length && parsedBooks.length > 0) {
    throw new Error('La importación falló porque no se detectaron columnas válidas (ej: "Título", "Autor", "Precio"). Revisa que las cabeceras de tu Google Sheet coincidan con los nombres requeridos.');
  }

  return parsedBooks;
}
