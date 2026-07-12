import { useState, useEffect } from 'react';
import {
  BookOpen, Award, TrendingUp, Target, BarChart2,
  CheckCircle, XCircle, Clock, ChevronDown, Users, Minus
} from 'lucide-react';
import { getStudentResults, getOverallGrade } from '../../api/assessments';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  Assignment: 'bg-blue-100 text-blue-700',
  Quiz: 'bg-purple-100 text-purple-700',
  MidExam: 'bg-amber-100 text-amber-700',
  EndExam: 'bg-red-100 text-red-700',
  Lab: 'bg-emerald-100 text-emerald-700',
  Viva: 'bg-pink-100 text-pink-700',
  Project: 'bg-indigo-100 text-indigo-700',
};

const GRADE_CONFIG = {
  O:  { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Outstanding' },
  'A+': { color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', label: 'Excellent' },
  A:  { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Very Good' },
  'B+': { color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', label: 'Good' },
  B:  { color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', label: 'Above Average' },
  C:  { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Average' },
  F:  { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', label: 'Failed' },
};

// ─── PERCENT BAR ──────────────────────────────────────────────────────────────

function PercentBar({ value, max = 100, passing }) {
  const pct = Math.min(100, (value / max) * 100);
  const passingPct = (passing / max) * 100;
  const passed = value >= passing;

  return (
    <div className="relative h-3 bg-slate-100 rounded-full overflow-visible">
      {/* Passing threshold marker */}
      <div
        className="absolute top-0 h-3 w-0.5 bg-slate-400 z-10"
        style={{ left: `${passingPct}%` }}
        title={`Passing: ${passing}`}
      />
      {/* Score bar */}
      <div
        className={`h-full rounded-full transition-all duration-700 ${passed ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── RANK BADGE ───────────────────────────────────────────────────────────────

function RankBadge({ rank, total }) {
  if (!rank || !total) return <span className="text-slate-400 text-xs">—</span>;
  const pct = ((rank / total) * 100).toFixed(0);
  const color = rank <= 3 ? 'text-amber-600' : rank <= Math.ceil(total * 0.25) ? 'text-sky-600' : 'text-slate-600';
  return (
    <div className={`text-center ${color}`}>
      <div className="font-extrabold text-lg leading-none">#{rank}</div>
      <div className="text-xs opacity-70">of {total}</div>
    </div>
  );
}

// ─── OVERALL GRADE CARD ───────────────────────────────────────────────────────

function OverallGradeCard({ gradeData, loading }) {
  if (loading) return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 flex justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (!gradeData || gradeData.overallPercentage === null) return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-slate-400">
      <Clock size={28} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm font-medium">No published results yet</p>
      <p className="text-xs mt-1">Your overall grade will appear once assessments are published</p>
    </div>
  );

  const cfg = GRADE_CONFIG[gradeData.grade] || GRADE_CONFIG['F'];

  return (
    <div className={`rounded-2xl border-2 p-6 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Grade</p>
          <div className={`text-6xl font-extrabold leading-none ${cfg.color}`}>{gradeData.grade}</div>
          <p className={`text-sm font-semibold mt-1 ${cfg.color}`}>{cfg.label}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-slate-800">{gradeData.overallPercentage}%</div>
          <p className="text-xs text-slate-400 mt-1">Weighted Average</p>
          <p className="text-xs text-slate-400">{gradeData.totalWeightage}% of marks counted</p>
        </div>
      </div>

      {/* Breakdown Table */}
      {gradeData.breakdown?.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Breakdown</p>
          {gradeData.breakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[b.type]}`}>{b.type}</span>
              <span className="flex-1 text-slate-700 font-medium truncate">{b.title}</span>
              <span className="text-xs text-slate-400">{b.weightage}%</span>
              <span className={`text-xs font-bold ${b.myPercentage === null ? 'text-slate-300' : b.myPercentage >= 50 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {b.myPercentage !== null ? `${b.myPercentage}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ASSESSMENT RESULT CARD ───────────────────────────────────────────────────

function AssessmentResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const { myMark, classAnalytics } = result;

  const hasResult = !!myMark;
  const passed = myMark && !myMark.isAbsent && myMark.passed;
  const isAbsent = myMark?.isAbsent;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isAbsent ? 'bg-slate-100' : !hasResult ? 'bg-slate-50' : passed ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            {isAbsent ? <Minus size={18} className="text-slate-400" /> :
             !hasResult ? <Clock size={18} className="text-slate-300" /> :
             passed ? <CheckCircle size={18} className="text-emerald-600" /> :
             <XCircle size={18} className="text-rose-500" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[result.type]}`}>
                {result.type}
              </span>
              <span className="text-xs text-slate-400 font-medium">{result.weightage}% weight</span>
            </div>
            <h3 className="font-bold text-slate-900 mt-1 leading-tight">{result.title}</h3>

            {!hasResult ? (
              <p className="text-xs text-slate-400 mt-1">Result pending publication</p>
            ) : isAbsent ? (
              <p className="text-xs text-rose-500 font-semibold mt-1">Marked Absent</p>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-slate-900">{myMark.marksObtained}</span>
                  <span className="text-slate-400 text-sm">/ {result.totalMarks}</span>
                  <span className={`text-sm font-bold ml-auto ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {myMark.percentage}%
                  </span>
                </div>
                <PercentBar value={myMark.marksObtained} max={result.totalMarks} passing={result.passingMarks} />
                {myMark.remarks && (
                  <p className="text-xs text-slate-500 italic mt-1">"{myMark.remarks}"</p>
                )}
              </div>
            )}
          </div>

          {/* Rank */}
          <div className="flex-shrink-0">
            <RankBadge rank={classAnalytics.rank} total={classAnalytics.totalStudents} />
          </div>
        </div>

        {/* Expand toggle */}
        {hasResult && !isAbsent && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Class Analytics
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expanded Analytics */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{classAnalytics.highest}</p>
            <p className="text-xs text-slate-400">Highest</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{classAnalytics.average}</p>
            <p className="text-xs text-slate-400">Class Avg</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{classAnalytics.median}</p>
            <p className="text-xs text-slate-400">Median</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{classAnalytics.passPercentage}%</p>
            <p className="text-xs text-slate-400">Pass Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{classAnalytics.totalStudents}</p>
            <p className="text-xs text-slate-400">Students</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StudentResultsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [results, setResults] = useState([]);
  const [gradeData, setGradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Fetch enrolled offerings
  useEffect(() => {
    import('../../api/enrollments').then(({ getMyEnrollments }) => {
      getMyEnrollments()
        .then(res => {
          const active = (res.data.enrollments || []).filter(e => e.status === 'Enrolled');
          setEnrollments(active);
          if (active.length > 0) setSelectedOffering(active[0].courseOfferingId);
        })
        .catch(() => toast.error('Failed to load your enrollments'))
        .finally(() => setLoading(false));
    });
  }, []);

  // Fetch results whenever offering changes
  useEffect(() => {
    if (!selectedOffering?._id) return;
    setResultsLoading(true);
    setGradeLoading(true);

    getStudentResults(selectedOffering._id)
      .then(res => setResults(res.data.results || []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setResultsLoading(false));

    getOverallGrade(selectedOffering._id)
      .then(res => setGradeData(res.data))
      .catch(() => {})
      .finally(() => setGradeLoading(false));
  }, [selectedOffering?._id]);

  if (loading) return (
    <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
  );

  if (enrollments.length === 0) return (
    <div className="py-20 text-center text-slate-400">
      <BookOpen size={40} className="mx-auto mb-4 opacity-30" />
      <p className="font-semibold text-lg">No Active Enrollments</p>
      <p className="text-sm mt-1">Enroll in courses to view your assessment results.</p>
    </div>
  );

  const publishedCount = results.filter(r => r.myMark !== null).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Results</h1>
        <p className="text-slate-500 text-sm mt-0.5">View your marks, rank, and overall grade for each course.</p>
      </div>

      {/* Course Selector */}
      <div className="flex flex-wrap gap-2">
        {enrollments.map(e => {
          const off = e.courseOfferingId;
          return (
            <button
              key={off._id}
              onClick={() => setSelectedOffering(off)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 border ${
                selectedOffering?._id === off._id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {off.courseId?.courseTitle || off.courseId?.courseCode || 'Course'} — {off.semester} {off.year}
            </button>
          );
        })}
      </div>

      {selectedOffering && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Overall Grade */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Overall Grade
            </h2>
            <OverallGradeCard gradeData={gradeData} loading={gradeLoading} />

            {/* Quick Stats */}
            {!gradeLoading && results.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Assessments</span>
                  <span className="font-bold text-slate-800">{results.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Results Published</span>
                  <span className="font-bold text-slate-800">{publishedCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Passed</span>
                  <span className="font-bold text-emerald-600">
                    {results.filter(r => r.myMark?.passed).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Failed / Absent</span>
                  <span className="font-bold text-rose-500">
                    {results.filter(r => r.myMark && (!r.myMark.passed || r.myMark.isAbsent)).length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Assessment Results */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <BarChart2 size={16} className="text-sky-500" /> Assessment Results
            </h2>

            {resultsLoading ? (
              <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <Target size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No results yet</p>
                <p className="text-sm mt-1">Results will appear here once published by your faculty.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(r => (
                  <AssessmentResultCard key={r.assessmentId} result={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
