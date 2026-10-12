import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  Check,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { Question } from '../../types/game';
import { sound } from '../../services/soundService';
import { ExcelService } from '../../services/excelService';

interface CsvImportModalProps {
  isOpen: boolean;
  gameId: string;
  existingQuestions: Question[];
  onImportSuccess: (importedQuestions: Question[]) => void;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  gameId,
  existingQuestions,
  onImportSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste'>('excel');
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download official Excel template (.xlsx)
  const handleDownloadExcelTemplate = () => {
    sound.playClick();
    ExcelService.downloadTemplate('Quiz_Questions_Template.xlsx');
  };

  // Download CSV alternative template
  const handleDownloadCsvTemplate = () => {
    sound.playClick();
    const headers = 'Question,Type,Option A,Option B,Option C,Option D,Correct Answer,Points,Timer (Seconds),Explanation\n';
    const sampleRows = [
      '"What is the capital of France?","mcq","Berlin","Madrid","Paris","Rome","C","15","30","Paris is the capital of France."',
      '"Which planet is known as the Red Planet?","mcq","Venus","Mars","Jupiter","Mercury","B","10","25","Mars contains iron oxide rust."',
      '"Water freezes at 0 degrees Celsius.","true_false","TRUE","FALSE","","","A","10","20","Freezing point of water is 0°C."',
      '"What is 15 x 4?","mcq","50","55","60","65","C","10","20","15 multiplied by 4 equals 60."',
      '"Which animal is the largest mammal?","mcq","African Elephant","Blue Whale","Giraffe","Hippopotamus","B","15","25","Blue whale is the largest."',
      '"What gas do plants absorb?","short_answer","","","","","Carbon Dioxide","20","30","Plants absorb CO2."',
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Quiz_Questions_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file drop / upload
  const handleFileUpload = async (file: File) => {
    setError(null);
    setWarnings([]);
    setFileName(file.name);

    try {
      const result = await ExcelService.parseFile(file, gameId);
      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(' '));
        return;
      }
      if (result.questions.length === 0) {
        setError('No valid questions found in this file. Please ensure data matches the template format.');
        return;
      }

      sound.playBonus();
      setParsedQuestions(result.questions);
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to read file.');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Process text pasted into text area (CSV or JSON)
  const handleParsePastedText = () => {
    setError(null);
    setWarnings([]);
    if (!inputText.trim()) {
      setError('Please paste CSV or JSON content first.');
      return;
    }

    try {
      if (inputText.trim().startsWith('[') || inputText.trim().startsWith('{')) {
        const json = JSON.parse(inputText);
        const arr = Array.isArray(json) ? json : [json];
        const formatted: Question[] = arr.map((q, idx) => ({
          ...q,
          id: `q_pasted_${Date.now()}_${idx}`,
          gameId,
          order: idx + 1,
        }));
        setParsedQuestions(formatted);
      } else {
        // Parse CSV lines
        const lines = inputText.trim().split('\n');
        const rows = lines.map((l) => {
          const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const matches: string[] = [];
          let match;
          while ((match = regex.exec(l)) !== null && matches.length < 10) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            matches.push(val.trim());
            if (regex.lastIndex >= l.length) break;
          }
          return matches;
        });

        // Use ExcelService sheet rows parser
        const dummyFile = new Blob([inputText], { type: 'text/csv' });
        ExcelService.parseFile(dummyFile as File, gameId).then((res) => {
          if (res.questions.length > 0) {
            setParsedQuestions(res.questions);
            sound.playBonus();
          } else {
            setError('Could not parse questions from pasted text.');
          }
        });
      }
    } catch (err: any) {
      setError(`Failed to parse text: ${err.message}`);
    }
  };

  // Commit Import
  const handleCommitImport = () => {
    if (parsedQuestions.length === 0) return;

    sound.playVictory();

    let finalQuestions: Question[] = [];
    if (importMode === 'replace') {
      finalQuestions = parsedQuestions.map((q, idx) => ({
        ...q,
        order: idx + 1,
      }));
    } else {
      // Append
      const startIndex = existingQuestions.length;
      const renumbered = parsedQuestions.map((q, idx) => ({
        ...q,
        order: startIndex + idx + 1,
      }));
      finalQuestions = [...existingQuestions, ...renumbered];
    }

    onImportSuccess(finalQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 font-fun">
                Import Questions from Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500">
                Bulk upload quiz questions using Microsoft Excel or CSV spreadsheet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Download Template Callout */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[11px] font-black uppercase px-2 py-0.5 rounded-md">
                Step 1
              </span>
              <h4 className="font-extrabold text-sm text-emerald-950">
                Download Official Quiz Template
              </h4>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Includes pre-filled examples for Multiple Choice, True/False, and Short Answer.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadExcelTemplate}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download .XLSX</span>
            </button>
            <button
              onClick={handleDownloadCsvTemplate}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-emerald-300 transition-colors cursor-pointer"
              title="Download as CSV text"
            >
              .CSV
            </button>
          </div>
        </div>

        {/* Step 2: Upload or Paste */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[11px] font-black uppercase px-2 py-0.5 rounded-md">
                Step 2
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">
                Upload your completed spreadsheet
              </h4>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab('excel')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'excel'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Upload File (.xlsx)
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Paste Text / JSON
              </button>
            </div>
          </div>

          {activeTab === 'excel' ? (
            /* Drag and Drop Box */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={onFileInputChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-extrabold text-sm text-slate-900 font-fun">
                {fileName ? fileName : 'Click to browse or drag and drop your file here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
              </p>
            </div>
          ) : (
            /* Textarea Paste */
            <div className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste CSV rows (e.g. Question, Type, Option A, Option B, ...) or raw JSON array of questions here..."
                rows={5}
                className="w-full p-3 font-mono text-xs rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-hidden bg-slate-50"
              />
              <button
                onClick={handleParsePastedText}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Parse Text
              </button>
            </div>
          )}
        </div>

        {/* Error or Warning Display */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Warnings:
            </div>
            {warnings.slice(0, 3).map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        )}

        {/* Parsed Preview Section */}
        {parsedQuestions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  Ready to Import {parsedQuestions.length} Questions
                </span>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Action:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  <span>Add to existing ({existingQuestions.length})</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer ml-2">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span className="text-rose-600">Replace all</span>
                </label>
              </div>
            </div>

            {/* Question Preview List */}
            <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
              {parsedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="truncate flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{q.question}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] font-extrabold text-slate-500 uppercase">
                    <span>{q.type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="text-indigo-600">{q.points} pts</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Commit Import Button */}
            <button
              onClick={handleCommitImport}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Import {parsedQuestions.length} Questions Into Quiz</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Excel .xlsx, .xls, .csv supported</span>
          <button onClick={onClose} className="hover:text-slate-700 font-semibold cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
