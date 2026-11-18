const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const mammoth = require("mammoth");
const path = require("path");

async function decodeSecretMessage(source) {
  try {
    let html;

    if (/^https?:\/\//i.test(source)) {
      const isDocx = /\.docx(?:$|[?#])/i.test(source);

      if (isDocx) {
        const response = await axios.get(source, {
          responseType: "arraybuffer",
        });
        const result = await mammoth.convertToHtml({
          buffer: Buffer.from(response.data),
        });
        html = result.value;
      } else {
        const response = await axios.get(source);
        html = response.data;
      }
    } else {
      const filePath = String(source);
      if (!/\.docx$/i.test(filePath)) {
        throw new Error("Local input must be a .docx file.");
      }

      const buffer = await fs.promises.readFile(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
    }

    // 2. Parse the HTML table using Cheerio
    const $ = cheerio.load(html);
    const table = $("table").first();

    if (!table.length) {
      console.log("No table found in the document.");
      return;
    }

    const gridData = {};
    let maxX = 0;
    let maxY = 0;

    // 3. Extract (x, character, y) from each row, skipping the header row
    const rows = table.find("tr").toArray().slice(1);

    for (const row of rows) {
      const cells = $(row)
        .find("td, th")
        .map((i, el) => $(el).text().trim())
        .get()
        .filter((cell) => cell.length > 0);

      if (cells.length >= 3) {
        const x = parseInt(cells[0], 10);
        const char = cells[1];
        const y = parseInt(cells[2], 10);

        if (!isNaN(x) && !isNaN(y)) {
          gridData[`${x},${y}`] = char;
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // 4. Print the grid from top (maxY) to bottom (0)
    for (let y = maxY; y >= 0; y--) {
      let line = [];
      for (let x = 0; x <= maxX; x++) {
        // Default to a space character if no character is specified at (x, y)
        line.push(gridData[`${x},${y}`] || " ");
      }
      console.log(line.join(""));
    }
  } catch (error) {
    console.error("Error fetching or parsing the document:", error.message);
  }
}
// test changed author
if (require.main === module) {
  decodeSecretMessage(
    path.join(__dirname, "decoder_hidden_message.docx"),
    // "https://docs.google.com/document/d/e/2PACX-1vSvM5gDlNvt7npYHhp_XfsJvuntUhq184By5xO_pA4b_gCWeXb6dM6ZxwN8rE6S4ghUsCj2VKR21oEP/pub",
  );
}

module.exports = decodeSecretMessage;
