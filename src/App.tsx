import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  UserPlus, 
  Users, 
  LayoutDashboard, 
  School, 
  Trophy, 
  Phone, 
  IdCard,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Upload,
  FileText,
  X,
  Download,
  Edit,
  Trash2,
  FileSpreadsheet,
  FileDown,
  Lock,
  LogIn,
  LogOut,
  Database as DbIcon,
  Link as LinkIcon
} from 'lucide-react';

type Participant = {
  id: any;
  nama_sekolah: string;
  nama_peserta: string;
  tempat_tanggal_lahir: string;
  cabang_lomba: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
};

const CABANG_LOMBA = [
  "Gambar Bercerita",
  "Kriya Anyam",
  "Menyanyi Solo",
  "Pantomim",
  "Seni Tari",
  "Mendongeng",
  "Menulis Cerita"
];

const SEKOLAH_LIST = [
  "SDN BAUJENG I",
  "SDN BAUJENG II",
  "SDN BEJI I",
  "SDN BEJI II",
  "SDN BEJI IV",
  "SDN CANGKRINGMALANG I",
  "SDN CANGKRINGMALANG II",
  "SDN CANGKRINGMALANG III",
  "SDN GAJAHBENDO",
  "SDN GLANGGANG I",
  "SDN GLANGGANG II",
  "SDN GUNUNGGANGSIR I",
  "SDN GUNUNGGANGSIR II",
  "SDN GUNUNGGANGSIR III",
  "SDN GUNUNGSARI I",
  "SDN GUNUNGSARI II",
  "SDN KEDUNGBOTO",
  "SDN KEDUNGRINGIN I",
  "SDN KEDUNGRINGIN II",
  "SDN KEDUNGRINGIN III",
  "SDN KEDUNGRINGIN IV",
  "SDN KENEP",
  "SDN NGEMBE 1",
  "SDN PAGAK",
  "SDN SIDOWAYAH",
  "SDN SUMBERSARI I",
  "SDN SUMBERSARI II",
  "SD ISLAM YASPAI",
  "SD ISLAM HASAN MUNADI",
  "SD AR-ROUDHOH",
  "SD ISLAM AZ ZAHRA",
  "SD ISLAM DARUSSALAM"
];

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState<'home' | 'pendaftaran' | 'rekap'>('pendaftaran');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('Semua Sekolah');
  const [editingId, setEditingId] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<{ provider: string, connected: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [formData, setFormData] = useState({
    nama_sekolah: '',
    nama_peserta: [''],
    tempat_tanggal_lahir: [''],
    cabang_lomba: '',
    file_url: '',
    file_name: ''
  });

  useEffect(() => {
    fetchParticipants();
    fetchDbStatus();

    const deadline = new Date('2026-03-10T23:00:00+07:00').getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = deadline - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDbStatus = async () => {
    try {
      const response = await fetch('/api/db-status');
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Error fetching DB status:', error);
    }
  };

  const getParticipantCount = (cabang: string) => {
    if (cabang === 'Pantomim') return 2;
    if (cabang === 'Seni Tari') return 3;
    return 1;
  };

  const handleCabangChange = (val: string) => {
    const count = getParticipantCount(val);
    setFormData(prev => {
      let newNames = [...prev.nama_peserta];
      let newTtls = [...prev.tempat_tanggal_lahir];
      
      if (newNames.length < count) {
        while (newNames.length < count) newNames.push('');
      } else {
        newNames = newNames.slice(0, count);
      }

      if (newTtls.length < count) {
        while (newTtls.length < count) newTtls.push('');
      } else {
        newTtls = newTtls.slice(0, count);
      }

      return { ...prev, cabang_lomba: val, nama_peserta: newNames, tempat_tanggal_lahir: newTtls };
    });
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/participants');
      const data = await response.json();
      if (Array.isArray(data)) {
        setParticipants(data);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin123') { // Simple hardcoded password for demo
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPassword('');
      setLoginError('');
      setView('home');
    } else {
      setLoginError('Password salah!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('pendaftaran');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Mengirim data pendaftaran...");
    setSubmitting(true);
    setMessage(null);

    try {
      const url = editingId ? `/api/participants/${editingId}` : '/api/participants';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        nama_peserta: formData.nama_peserta.join('\n'),
        tempat_tanggal_lahir: formData.tempat_tanggal_lahir.join('\n')
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        throw new Error("Server tidak merespon dengan format yang benar (JSON).");
      }

      if (response.ok) {
        console.log("Pendaftaran berhasil disimpan!");
        setMessage({ 
          type: 'success', 
          text: editingId ? 'Data berhasil diperbarui!' : 'Pendaftaran berhasil disimpan!' 
        });
        
        // Clear form
        setFormData({
          nama_sekolah: '',
          nama_peserta: [''],
          tempat_tanggal_lahir: [''],
          cabang_lomba: '',
          file_url: '',
          file_name: ''
        });
        setEditingId(null);
        
        // Refresh data
        await fetchParticipants();
        
        // Stay on page instead of redirecting
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        console.error("Gagal menyimpan:", result.error);
        setMessage({ type: 'error', text: result.error || 'Gagal menyimpan pendaftaran.' });
      }
    } catch (error) {
      console.error("Kesalahan koneksi:", error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Terjadi kesalahan koneksi ke server. Pastikan server backend sedang berjalan.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      const response = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Data berhasil dihapus!' });
        fetchParticipants();
        setTimeout(() => setMessage(null), 3000);
      } else {
        alert('Gagal menghapus data: ' + (result.error || 'Terjadi kesalahan'));
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Terjadi kesalahan koneksi saat menghapus data');
    }
  };

  const handleEdit = (participant: Participant) => {
    setFormData({
      nama_sekolah: participant.nama_sekolah,
      nama_peserta: participant.nama_peserta.split('\n'),
      tempat_tanggal_lahir: participant.tempat_tanggal_lahir.split('\n'),
      cabang_lomba: participant.cabang_lomba,
      file_url: participant.file_url || '',
      file_name: participant.file_name || ''
    });
    setEditingId(participant.id);
    setView('pendaftaran');
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lembar Pendaftaran FLS3N-SD Tahun 2026', 105, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.text('Kecamatan Beji Kabupaten Pasuruan', 105, 28, { align: 'center' });

    // Table
    const tableData = filteredParticipants.map((p, index) => [
      index + 1,
      p.nama_sekolah,
      p.nama_peserta,
      p.tempat_tanggal_lahir,
      p.cabang_lomba
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['No.', 'Nama Sekolah', 'Nama Siswa', 'Tempat Tgl Lahir', 'Cabang Lomba']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        halign: 'center'
      },
      styles: { 
        textColor: [0, 0, 0], 
        fontSize: 10,
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: 45 }
      }
    });

    // Signature section
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const today = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const formattedDate = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const signatureX = 130;
    
    doc.text(`Pasuruan, ${formattedDate}`, signatureX, finalY);
    doc.text('Ketua FLS3N-SD Kec. Beji', signatureX, finalY + 6);
    
    // Name and NIP
    doc.setFont('helvetica', 'bold');
    doc.text('LAILATUL FITRI, S.Pd.SD.', signatureX, finalY + 30);
    
    // Underline for name
    const nameWidth = doc.getTextWidth('LAILATUL FITRI, S.Pd.SD.');
    doc.setLineWidth(0.5);
    doc.line(signatureX, finalY + 31, signatureX + nameWidth, finalY + 31);
    
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 198406212014062001', signatureX, finalY + 37);

    doc.save(`Lembar_Pendaftaran_FLS3N_Beji_2026.pdf`);
  };

  const downloadCSV = () => {
    const dataToExport = filteredParticipants.map((p) => ({
      'Nama Sekolah': p.nama_sekolah,
      'Nama Peserta': p.nama_peserta,
      'Tempat Tgl Lahir': p.tempat_tanggal_lahir,
      'Cabang Lomba': p.cabang_lomba
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Peserta_FLS3N_Beji_2026.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSQL = () => {
    window.location.href = '/api/export-sql';
  };

  const getUrlType = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'webm'].includes(ext || '')) return 'video';
    if (['mp3', 'wav'].includes(ext || '')) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  };

  const CountdownItem = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center px-2 md:px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-sm min-w-[60px] md:min-w-[80px]">
      <span className="text-xl md:text-2xl font-black text-indigo-900 leading-none">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );

  const ParticipantsTable = ({ showCSV = false }: { showCSV?: boolean }) => {
    const schools = ['Semua Sekolah', ...new Set(participants.map(p => p.nama_sekolah))].sort();

    return (
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="p-5 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 mr-2">
              <h3 className="font-bold text-lg md:text-xl">Daftar Peserta</h3>
              <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] md:text-xs font-black border border-indigo-100">
                {participants.length} Total
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={downloadPDF}
                className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-rose-600 text-white text-[10px] md:text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95"
              >
                <FileText size={14} className="md:w-4 md:h-4" />
                <span>PDF</span>
              </button>
              {showCSV && (
                <>
                  <button 
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] md:text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                  >
                    <FileSpreadsheet size={14} className="md:w-4 md:h-4" />
                    <span>CSV</span>
                  </button>
                  <button 
                    onClick={downloadSQL}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-slate-700 text-white text-[10px] md:text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 active:scale-95"
                  >
                    <DbIcon size={14} className="md:w-4 md:h-4" />
                    <span>SQL</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 flex-1 md:max-w-2xl">
            <div className="relative flex-1">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none w-full text-xs md:text-sm appearance-none bg-white"
              >
                {schools.map(school => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Cari nama atau lomba..."
                className="pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none w-full text-xs md:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nama Sekolah</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nama Peserta</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Tempat Tgl Lahir</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Cabang Lomba</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Berkas</th>
                {isAdmin && <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2 className="animate-spin" size={32} />
                      <span className="text-xs md:text-sm font-bold uppercase tracking-widest">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-slate-400">
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest">Tidak ada data ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 md:px-8 py-4 md:py-5">
                      <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">
                        {participant.nama_sekolah}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-5">
                      <div className="text-xs md:text-sm font-bold text-slate-900 whitespace-pre-line">
                        {participant.nama_peserta}
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-sm text-slate-500 whitespace-pre-line">
                      {participant.tempat_tanggal_lahir}
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-5">
                      <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs font-bold bg-indigo-50 text-indigo-700 whitespace-nowrap">
                        {participant.cabang_lomba}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-4 md:py-5">
                      <div className="flex items-center justify-center gap-2">
                        {participant.file_url ? (
                          <a 
                            href={participant.file_url} 
                            download={participant.file_name}
                            title="Unduh Berkas"
                            className="p-1.5 md:p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            <Download size={14} className="md:w-4 md:h-4" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Tidak ada</span>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 md:px-8 py-4 md:py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(participant)}
                            className="p-1.5 md:p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-amber-500 hover:text-white transition-all"
                            title="Edit Data"
                          >
                            <Edit size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(participant.id)}
                            className="p-1.5 md:p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-500 hover:text-white transition-all"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} className="md:w-4 md:h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const filteredParticipants = Array.isArray(participants) ? participants.filter(p => {
    const matchesSearch = p.nama_peserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.cabang_lomba.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = schoolFilter === 'Semua Sekolah' || p.nama_sekolah === schoolFilter;
    return matchesSearch && matchesSchool;
  }) : [];

  const showFileUpload = ['Menyanyi Solo', 'Pantomim', 'Seni Tari'].includes(formData.cabang_lomba);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Marquee Info */}
      <div className="bg-indigo-900 text-amber-400 py-2.5 overflow-hidden whitespace-nowrap relative border-b border-amber-500/20">
        <div className="animate-marquee inline-block font-black text-[10px] md:text-xs uppercase tracking-[0.2em]">
          Pendaftaran FLS3N-SD Tahun 2026 Kecamatan Beji dimulai tanggal 1-10 Maret 2026 pukul 23.00 WIB • Segera daftarkan delegasi sekolah Anda sebelum batas waktu berakhir • 
        </div>
      </div>

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
        {/* Database Status Indicator */}
        {dbStatus && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg border ${
              dbStatus.connected ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}>
              <div className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              DB: {dbStatus.provider} {dbStatus.connected ? '(Connected)' : '(Error)'}
            </div>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 md:mb-16">
          <div className="flex items-center gap-5">
            <div 
              onClick={() => { 
                if (isAdmin) {
                  setView('home'); 
                  setEditingId(null); 
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-100 transition-transform cursor-pointer active:scale-95 overflow-hidden border border-indigo-50"
            >
              <img 
                src="https://pusatprestasinasional.kemendikdasmen.go.id/uploads/event/cOKxdgS0KQhv9FlzGXeJin7A4hX8T6JaIwK3Evy1.png" 
                alt="Logo FLS3N" 
                className="w-full h-full object-contain p-2"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-indigo-950 tracking-tight leading-tight">
                FLS3N SD <span className="text-amber-500">2026</span>
              </h1>
              <p className="text-indigo-400 font-bold text-xs md:text-base uppercase tracking-[0.3em]">Kecamatan Beji</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Countdown Timer */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden md:block text-right mr-2">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none mb-1">Batas Akhir</p>
                <p className="text-xs font-bold text-indigo-900">Pendaftaran</p>
              </div>
              <div className="flex gap-2">
                <CountdownItem value={timeLeft.days} label="Hari" />
                <CountdownItem value={timeLeft.hours} label="Jam" />
                <CountdownItem value={timeLeft.minutes} label="Menit" />
                <CountdownItem value={timeLeft.seconds} label="Detik" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  {view !== 'home' && (
                    <button 
                      onClick={() => { setView('home'); setEditingId(null); }}
                      className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl bg-white border border-indigo-100 text-indigo-600 text-xs md:text-sm font-bold hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                    >
                      <LayoutDashboard size={18} />
                      <span>Dashboard</span>
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs md:text-sm font-bold hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showLoginModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-slate-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Login Admin</h3>
                  <button onClick={() => setShowLoginModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="password" 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Masukkan password admin..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                      />
                    </div>
                    {loginError && <p className="text-rose-500 text-xs font-bold">{loginError}</p>}
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <LogIn size={20} />
                    <span>Masuk</span>
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'home' && isAdmin && (
            <motion.div
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Registration Card */}
              <button 
                onClick={() => setView('pendaftaran')}
                className="group relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                  <UserPlus size={160} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <UserPlus size={24} className="md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Pendaftaran Baru</h3>
                  <p className="text-slate-500 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                    Daftarkan peserta didik terbaik untuk mengikuti seleksi FLS3N-SD tingkat Kecamatan Beji tahun 2026.
                  </p>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm md:text-base">
                    <span>Mulai Daftar</span>
                    <ChevronRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>

              {/* Summary Card */}
              <button 
                onClick={() => setView('rekap')}
                className="group relative bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-emerald-100 hover:-translate-y-1 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
                  <Users size={160} />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Users size={24} className="md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Rekap Peserta</h3>
                  <p className="text-slate-500 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                    Lihat dan pantau daftar seluruh peserta yang telah terdaftar dari berbagai sekolah di wilayah Beji.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm md:text-base">
                      <span>Lihat Rekap</span>
                      <ChevronRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                      <span className="text-lg md:text-xl font-black text-slate-900">{participants.length} Peserta</span>
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {view === 'pendaftaran' && (
            <motion.div
              key="pendaftaran"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-2xl font-bold">{editingId ? 'Edit Data Peserta' : 'Formulir Pendaftaran'}</h2>
                  <p className="text-slate-500">{editingId ? 'Perbarui data peserta dengan benar.' : 'Lengkapi data peserta dengan benar.'}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                    >
                      {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      <span className="text-sm font-medium">{message.text}</span>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <School size={16} className="text-indigo-500" />
                        Nama Sekolah
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                        value={formData.nama_sekolah}
                        onChange={(e) => setFormData({...formData, nama_sekolah: e.target.value})}
                      >
                        <option value="">Pilih Sekolah</option>
                        {SEKOLAH_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Trophy size={16} className="text-indigo-500" />
                        Cabang Lomba
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                        value={formData.cabang_lomba}
                        onChange={(e) => handleCabangChange(e.target.value)}
                      >
                        <option value="">Pilih Cabang Lomba</option>
                        {CABANG_LOMBA.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {formData.nama_peserta.map((_, index) => (
                      <React.Fragment key={index}>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <UserPlus size={16} className="text-indigo-500" />
                            Nama Peserta {formData.nama_peserta.length > 1 ? index + 1 : ''}
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Contoh: Budi Santoso"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={formData.nama_peserta[index]}
                            onChange={(e) => {
                              const newNames = [...formData.nama_peserta];
                              newNames[index] = e.target.value;
                              setFormData({...formData, nama_peserta: newNames});
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <IdCard size={16} className="text-indigo-500" />
                            Tempat Tanggal Lahir {formData.tempat_tanggal_lahir.length > 1 ? index + 1 : ''}
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Contoh: Pasuruan, 12 Mei 2014"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={formData.tempat_tanggal_lahir[index]}
                            onChange={(e) => {
                              const newTtls = [...formData.tempat_tanggal_lahir];
                              newTtls[index] = e.target.value;
                              setFormData({...formData, tempat_tanggal_lahir: newTtls});
                            }}
                          />
                        </div>
                      </React.Fragment>
                    ))}

                  </div>

                  {showFileUpload && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <LinkIcon size={16} className="text-indigo-500" />
                          Link Berkas Pendukung (Google Drive/Lainnya)
                        </label>
                        <p className="text-xs text-slate-500">Wajib untuk cabang Menyanyi Solo, Pantomim, dan Seni Tari. Masukkan link file (MP3, MP4, JPG, atau PDF).</p>
                        
                        <div className="relative">
                          <input 
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all pr-12"
                            value={formData.file_url}
                            onChange={(e) => setFormData({...formData, file_url: e.target.value, file_name: 'Link Berkas'})}
                          />
                          {formData.file_url && (
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, file_url: '', file_name: ''})}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {formData.file_url && (
                        <div className="space-y-3">
                          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Preview & Link</p>
                            
                            <div className="space-y-3">
                              {/* Preview Logic */}
                              {getUrlType(formData.file_url) === 'image' && (
                                <div className="rounded-lg overflow-hidden border border-slate-100 max-h-48 flex justify-center bg-slate-50">
                                  <img src={formData.file_url} alt="Preview" className="max-w-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              
                              {getUrlType(formData.file_url) === 'video' && (
                                <div className="rounded-lg overflow-hidden border border-slate-100 bg-black">
                                  <video src={formData.file_url} controls className="w-full max-h-48" />
                                </div>
                              )}

                              {getUrlType(formData.file_url) === 'audio' && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <audio src={formData.file_url} controls className="w-full" />
                                </div>
                              )}

                              {getUrlType(formData.file_url) === 'pdf' && (
                                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg border border-rose-100 text-rose-700">
                                  <FileText size={24} />
                                  <span className="text-sm font-bold">Dokumen PDF</span>
                                </div>
                              )}

                              {getUrlType(formData.file_url) === 'other' && (
                                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-700">
                                  <LinkIcon size={24} />
                                  <span className="text-sm font-bold">Link Eksternal / Drive</span>
                                </div>
                              )}

                              <div className="pt-2 border-t border-slate-100">
                                <a 
                                  href={formData.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:underline break-all font-medium flex items-center gap-1"
                                >
                                  <LinkIcon size={12} />
                                  {formData.file_url}
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      disabled={submitting}
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          <span>{editingId ? 'Simpan Perubahan' : 'Simpan Pendaftaran'}</span>
                        </>
                      )}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({
                            nama_sekolah: '',
                            nama_peserta: '',
                            tempat_tanggal_lahir: '',
                            cabang_lomba: '',
                            file_url: '',
                            file_name: ''
                          });
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Table below form */}
              <div className="mt-12">
                <ParticipantsTable />
              </div>
            </motion.div>
          )}

          {view === 'rekap' && isAdmin && (
            <motion.div
              key="rekap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Peserta</p>
                  <p className="text-3xl font-black text-slate-900">{participants.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Sekolah</p>
                  <p className="text-3xl font-black text-slate-900">{new Set(participants.map(p => p.nama_sekolah)).size}</p>
                </div>
              </div>

              {/* Table Section */}
              <ParticipantsTable showCSV={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
              Panitia FLS3N-SD Kecamatan Beji &copy; 2026
            </p>
            {dbStatus && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                <div className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {dbStatus.provider}: {dbStatus.connected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  </div>
);
}
