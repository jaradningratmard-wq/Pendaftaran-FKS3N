import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const useSupabase = supabaseUrl && supabaseKey;

const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;
const db = !useSupabase ? new Database("fls3n_beji_2026.db") : null;

// Initialize SQLite if needed
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_sekolah TEXT,
      nama_peserta TEXT,
      tempat_tanggal_lahir TEXT,
      cabang_lomba TEXT,
      file_url TEXT,
      file_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Ensure all columns exist (handles cases where table existed with different schema)
  const columns = [
    "nama_sekolah",
    "nama_peserta",
    "tempat_tanggal_lahir",
    "cabang_lomba",
    "file_url",
    "file_name"
  ];

  for (const col of columns) {
    try {
      db.prepare(`ALTER TABLE participants ADD COLUMN ${col} TEXT`).run();
      console.log(`Migration: Added column ${col}`);
    } catch (e) {
      // Column likely already exists, ignore error
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/db-status", (req, res) => {
    res.json({
      provider: useSupabase ? "Supabase" : "SQLite",
      connected: useSupabase ? !!supabase : !!db,
      config: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }
    });
  });

  app.get("/api/export-sql", async (req, res) => {
    try {
      let sqlDump = "";
      
      if (useSupabase && supabase) {
        const { data, error } = await supabase.from('participants').select('*');
        if (error) throw error;
        
        sqlDump += "-- Supabase Export\n";
        sqlDump += "CREATE TABLE IF NOT EXISTS participants (\n";
        sqlDump += "  id SERIAL PRIMARY KEY,\n";
        sqlDump += "  nama_sekolah TEXT,\n";
        sqlDump += "  nama_peserta TEXT,\n";
        sqlDump += "  tempat_tanggal_lahir TEXT,\n";
        sqlDump += "  cabang_lomba TEXT,\n";
        sqlDump += "  file_url TEXT,\n";
        sqlDump += "  file_name TEXT,\n";
        sqlDump += "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n";
        sqlDump += ");\n\n";

        if (data && data.length > 0) {
          data.forEach((row: any) => {
            const values = [
              `'${row.nama_sekolah?.replace(/'/g, "''") || ''}'`,
              `'${row.nama_peserta?.replace(/'/g, "''") || ''}'`,
              `'${row.tempat_tanggal_lahir?.replace(/'/g, "''") || ''}'`,
              `'${row.cabang_lomba?.replace(/'/g, "''") || ''}'`,
              row.file_url ? `'${row.file_url}'` : 'NULL',
              row.file_name ? `'${row.file_name.replace(/'/g, "''")}'` : 'NULL'
            ].join(", ");
            sqlDump += `INSERT INTO participants (nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name) VALUES (${values});\n`;
          });
        }
      } else if (db) {
        sqlDump += "-- SQLite Export\n";
        sqlDump += "CREATE TABLE IF NOT EXISTS participants (\n";
        sqlDump += "  id INTEGER PRIMARY KEY AUTOINCREMENT,\n";
        sqlDump += "  nama_sekolah TEXT,\n";
        sqlDump += "  nama_peserta TEXT,\n";
        sqlDump += "  tempat_tanggal_lahir TEXT,\n";
        sqlDump += "  cabang_lomba TEXT,\n";
        sqlDump += "  file_url TEXT,\n";
        sqlDump += "  file_name TEXT,\n";
        sqlDump += "  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n";
        sqlDump += ");\n\n";

        const rows = db.prepare("SELECT * FROM participants").all();
        rows.forEach((row: any) => {
          const values = [
            `'${row.nama_sekolah?.replace(/'/g, "''") || ''}'`,
            `'${row.nama_peserta?.replace(/'/g, "''") || ''}'`,
            `'${row.tempat_tanggal_lahir?.replace(/'/g, "''") || ''}'`,
            `'${row.cabang_lomba?.replace(/'/g, "''") || ''}'`,
            row.file_url ? `'${row.file_url}'` : 'NULL',
            row.file_name ? `'${row.file_name.replace(/'/g, "''")}'` : 'NULL'
          ].join(", ");
          sqlDump += `INSERT INTO participants (nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name) VALUES (${values});\n`;
        });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=database_dump.sql');
      res.send(sqlDump);
    } catch (error) {
      console.error("Export Error:", error);
      res.status(500).send("Gagal mengekspor database");
    }
  });

  app.get("/api/participants", async (req, res) => {
    try {
      if (useSupabase && supabase) {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .order('nama_sekolah', { ascending: true })
          .order('nama_peserta', { ascending: true });
        
        if (error) throw error;
        return res.json(data);
      } else if (db) {
        const participants = db.prepare("SELECT * FROM participants ORDER BY nama_sekolah ASC, nama_peserta ASC").all();
        return res.json(participants);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  app.post("/api/participants", async (req, res) => {
    const { nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name } = req.body;
    
    if (!nama_sekolah || !nama_peserta || !tempat_tanggal_lahir || !cabang_lomba) {
      return res.status(400).json({ error: "Semua kolom harus diisi" });
    }

    try {
      if (useSupabase && supabase) {
        console.log("Mencoba menyimpan ke Supabase...");
        const { data, error } = await supabase
          .from('participants')
          .insert([{ 
            nama_sekolah, 
            nama_peserta, 
            tempat_tanggal_lahir, 
            cabang_lomba, 
            file_url, 
            file_name 
          }])
          .select();
        
        if (error) {
          console.error("Supabase Insert Error Detail:", error);
          return res.status(500).json({ 
            error: `Gagal menyimpan ke Supabase: ${error.message}. Pastikan tabel 'participants' sudah dibuat melalui SQL Editor.` 
          });
        }

        if (!data || data.length === 0) {
          throw new Error("Data berhasil disimpan tapi tidak mengembalikan ID.");
        }

        res.status(201).json({ id: data[0].id });
      } else if (db) {
        const stmt = db.prepare(`
          INSERT INTO participants (nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url || null, file_name || null);
        res.status(201).json({ id: result.lastInsertRowid });
      }
    } catch (error) {
      console.error("Insert Error:", error);
      res.status(500).json({ error: "Gagal menyimpan pendaftaran: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.put("/api/participants/:id", async (req, res) => {
    const { id } = req.params;
    const { nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name } = req.body;
    console.log(`Menerima permintaan update untuk ID: ${id}`);

    if (!nama_sekolah || !nama_peserta || !tempat_tanggal_lahir || !cabang_lomba) {
      console.warn("Update gagal: Data tidak lengkap");
      return res.status(400).json({ error: "Semua kolom harus diisi" });
    }

    try {
      if (useSupabase && supabase) {
        console.log("Mengupdate di Supabase...");
        const { error } = await supabase
          .from('participants')
          .update({ nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url, file_name })
          .eq('id', id);
        
        if (error) {
          console.error("Supabase Update Error:", error);
          throw error;
        }
        console.log("Berhasil diupdate di Supabase");
        res.json({ message: "Update berhasil di Supabase" });
      } else if (db) {
        console.log("Mengupdate di SQLite...");
        const numericId = parseInt(id);
        const targetId = isNaN(numericId) ? id : numericId;
        
        const stmt = db.prepare(`
          UPDATE participants 
          SET nama_sekolah = ?, nama_peserta = ?, tempat_tanggal_lahir = ?, cabang_lomba = ?, file_url = ?, file_name = ?
          WHERE id = ?
        `);
        const result = stmt.run(nama_sekolah, nama_peserta, tempat_tanggal_lahir, cabang_lomba, file_url || null, file_name || null, targetId);
        console.log(`Berhasil diupdate di SQLite. Baris terpengaruh: ${result.changes}`);
        res.json({ message: "Update berhasil di SQLite" });
      }
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ error: "Gagal memperbarui data: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.delete("/api/participants/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`Menerima permintaan hapus untuk ID: ${id}`);
    try {
      if (useSupabase && supabase) {
        console.log("Menghapus dari Supabase...");
        const { error } = await supabase
          .from('participants')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error("Supabase Delete Error:", error);
          throw error;
        }
        console.log("Berhasil dihapus dari Supabase");
        res.json({ message: "Data berhasil dihapus dari Supabase" });
      } else if (db) {
        console.log("Menghapus dari SQLite...");
        const numericId = parseInt(id);
        const targetId = isNaN(numericId) ? id : numericId;
        
        const result = db.prepare("DELETE FROM participants WHERE id = ?").run(targetId);
        console.log(`Berhasil dihapus dari SQLite. Baris terpengaruh: ${result.changes}`);
        res.json({ message: "Data berhasil dihapus dari SQLite" });
      } else {
        res.status(500).json({ error: "Database tidak terkonfigurasi" });
      }
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: "Gagal menghapus data: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database Provider: ${useSupabase ? "Supabase" : "SQLite"}`);
    if (useSupabase) {
      console.log(`Supabase URL: ${supabaseUrl}`);
    } else {
      console.log(`SQLite File: fls3n_beji_2026.db`);
    }
  });
}

startServer();
