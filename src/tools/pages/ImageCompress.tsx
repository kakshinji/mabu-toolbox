import { useMemo, useState } from 'react';
import { Dropzone, Button, Alert, ResultPanel, Field, Segmented } from '../../components/ui';
import { ThumbList } from '../../components/FileThumb';
import { Note, Row } from '../../components/ToolBody';
import { useFiles } from '../../components/useFiles';
import { compressImage, compressToTarget } from '../../utils/image';
import { baseName, formatBytes } from '../../utils/file';

type Mode = 'quality' | 'target';
type Unit = 'KB' | 'MB';

interface ResultItem {
  name: string;
  blob: Blob;
  meta?: string;
}

interface TargetStat {
  name: string;
  before: number;
  after: number;
  target: number;
  achieved: boolean;
  keptOriginal: boolean;
  quality: number | null;
  width: number;
  height: number;
}

const PRESETS: { label: string; value: number; unit: Unit }[] = [
  { label: '200 KB', value: 200, unit: 'KB' },
  { label: '500 KB', value: 500, unit: 'KB' },
  { label: '1 MB', value: 1, unit: 'MB' },
  { label: '2 MB', value: 2, unit: 'MB' },
  { label: '5 MB', value: 5, unit: 'MB' },
];

export default function ImageCompress() {
  const { files, add, remove, clear } = useFiles('image/*');
  const [mode, setMode] = useState<Mode>('quality');

  // 按质量压缩的参数
  const [quality, setQuality] = useState(75);
  const [maxSize, setMaxSize] = useState(0);
  const [format, setFormat] = useState<'keep' | 'jpeg' | 'webp'>('keep');

  // 按目标体积压缩的参数
  const [targetValue, setTargetValue] = useState(500);
  const [targetUnit, setTargetUnit] = useState<Unit>('KB');
  const [targetFormat, setTargetFormat] = useState<'auto' | 'jpeg' | 'webp'>('auto');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [result, setResult] = useState<ResultItem[]>([]);
  const [stats, setStats] = useState<TargetStat[]>([]);

  const before = files.reduce((s, f) => s + f.file.size, 0);
  // 按钮与标题直接显示用户输入的档位（500 KB / 2 MB），比 500.0 KB 好读
  const targetLabel = `${targetValue} ${targetUnit}`;
  const targetBytes = useMemo(
    () => Math.max(0, Math.round(targetValue * (targetUnit === 'MB' ? 1024 * 1024 : 1024))),
    [targetValue, targetUnit],
  );

  const run = async () => {
    if (mode === 'target' && targetBytes < 1024) {
      setError('目标体积太小，请至少设置为 1 KB');
      return;
    }
    setBusy(true);
    setError(undefined);
    setResult([]);
    setStats([]);
    const out: ResultItem[] = [];
    const statOut: TargetStat[] = [];

    try {
      if (mode === 'quality') {
        for (let i = 0; i < files.length; i += 1) {
          const f = files[i].file;
          const blob = await compressImage(f, { quality, maxSize: maxSize || undefined, format });
          const ext = format === 'webp' ? 'webp' : 'jpg';
          out.push({
            name: `${baseName(f.name)}-compressed.${ext}`,
            blob,
            meta: `${formatBytes(f.size)} → ${formatBytes(blob.size)}`,
          });
          setProgress({ done: i + 1, total: files.length });
        }
      } else {
        for (let i = 0; i < files.length; i += 1) {
          const f = files[i].file;
          const r = await compressToTarget(f, {
            targetBytes,
            format: targetFormat === 'auto' ? 'auto' : targetFormat,
          });
          const ext = r.format === 'original' ? (f.name.split('.').pop() || 'jpg') : r.format === 'webp' ? 'webp' : 'jpg';
          const base = baseName(f.name);
          const name = r.keptOriginal ? f.name : `${base}-${targetValue}${targetUnit.toLowerCase()}.${ext}`;

          const detail = r.keptOriginal
            ? `原图已小于目标，未重新压缩`
            : r.achieved
              ? `质量 ${r.quality} · ${r.width}×${r.height}`
              : `已压到最小（质量 ${r.quality} · ${r.width}×${r.height}），仍超出目标`;

          out.push({
            name,
            blob: r.blob,
            meta: `${formatBytes(f.size)} → ${formatBytes(r.blob.size)} · ${detail}`,
          });
          statOut.push({
            name: f.name,
            before: f.size,
            after: r.blob.size,
            target: targetBytes,
            achieved: r.achieved,
            keptOriginal: r.keptOriginal,
            quality: r.quality,
            width: r.width,
            height: r.height,
          });
          setProgress({ done: i + 1, total: files.length });
        }
      }
      setResult(out);
      setStats(statOut);
    } catch (e) {
      setError(e instanceof Error ? e.message : '压缩失败');
      if (out.length) setResult(out);
      if (statOut.length) setStats(statOut);
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const after = result.reduce((s, r) => s + r.blob.size, 0);
  const saved = result.length ? Math.round((1 - after / before) * 100) : 0;
  const failedCount = stats.filter((s) => !s.achieved).length;

  return (
    <div className="space-y-5">
      {!files.length ? (
        <Dropzone
          onFiles={add}
          accept="image/*"
          icon="gauge"
          title="把图片拖到这里"
          subtitle="支持批量，PNG / JPG / WebP / HEIC"
          hint="完全在本地压缩，图片不会上传"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-500">
              已选 <b className="text-ink-800">{files.length}</b> 张，原始合计 {formatBytes(before)}
            </p>
            <Button
              variant="ghost"
              className="!py-1.5 !text-xs"
              onClick={() => {
                clear();
                setResult([]);
                setStats([]);
              }}
            >
              清空
            </Button>
          </div>
          <ThumbList files={files} onRemove={remove} size={56} />
        </>
      )}

      <Field label="压缩方式">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setResult([]);
            setStats([]);
            setError(undefined);
          }}
          options={[
            { value: 'quality', label: '按质量' },
            { value: 'target', label: '按目标体积' },
          ]}
        />
      </Field>

      {mode === 'quality' ? (
        <div className="space-y-4">
          <Field label={`压缩质量：${quality}`} hint="一般用 70~80 就够，肉眼几乎无差别">
            <input
              type="range"
              min={20}
              max={95}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-jade-600"
            />
          </Field>
          <Row>
            <Field label="输出格式">
              <Segmented
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'keep', label: '保持原格式' },
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
            </Field>
            <Field label="同时限制最长边（0 = 不限制）">
              <input
                type="number"
                min={0}
                step={100}
                className="input w-40"
                value={maxSize}
                onChange={(e) => setMaxSize(Math.max(0, Number(e.target.value)))}
              />
            </Field>
          </Row>
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="目标体积（每张都不超过这个大小）"
            hint="例如上传要求「不超过 500KB」，就填 500 KB。工具会自动调整质量，必要时缩小尺寸"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                step={50}
                className="input w-32"
                value={targetValue}
                onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value)))}
              />
              <Segmented
                value={targetUnit}
                onChange={setTargetUnit}
                options={[
                  { value: 'KB', label: 'KB' },
                  { value: 'MB', label: 'MB' },
                ]}
              />
              <span className="text-xs tabular-nums text-ink-400">= {formatBytes(targetBytes).replace('.0 ', ' ')}</span>
            </div>
          </Field>

          <div>
            <span className="label">常用目标</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = targetValue === p.value && targetUnit === p.unit;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setTargetValue(p.value);
                      setTargetUnit(p.unit);
                    }}
                    className={`chip transition-colors ${
                      active ? '!bg-ink-900 !text-paper-50' : 'hover:!bg-paper-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="输出格式" hint="WebP 同画质下体积更小；JPG 兼容性最好；透明背景只有 WebP 能保留">
            <Segmented
              value={targetFormat}
              onChange={setTargetFormat}
              options={[
                { value: 'auto', label: '自动（优先 WebP）' },
                { value: 'jpeg', label: 'JPG' },
                { value: 'webp', label: 'WebP' },
              ]}
            />
          </Field>

          <Alert tone="info">
            PNG 不适合压到固定体积，目标模式下会自动改用 WebP / JPG。如果原图已经小于目标，会直接保留原图，不做二次压缩。
          </Alert>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy || !files.length}>
          {busy
            ? '压缩中…'
            : mode === 'quality'
              ? `开始压缩（${files.length} 张）`
              : `压到 ${targetLabel} 以内（${files.length} 张）`}
        </Button>
        {progress && (
          <span className="text-xs tabular-nums text-ink-500">
            {progress.done}/{progress.total}
          </span>
        )}
        {mode === 'target' && targetBytes > 0 && (
          <span className="text-xs text-ink-400">自动搜索质量与尺寸，通常需要几秒</span>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {result.length > 0 && (
        <div className="card flex flex-wrap items-center gap-4 p-5 text-sm">
          <span className="text-ink-500">
            原始：<b className="text-ink-800">{formatBytes(before)}</b>
          </span>
          <span className="text-ink-300">→</span>
          <span className="text-ink-500">
            压缩后：<b className="text-jade-700">{formatBytes(after)}</b>
          </span>
          <span className={`chip ${saved > 0 ? '!bg-jade-50 !text-jade-700' : '!bg-amberish-50 !text-[#8a6420]'}`}>
            {saved > 0 ? `节省 ${saved}%` : '没有变小'}
          </span>
        </div>
      )}

      {mode === 'target' && stats.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-900/[0.07] bg-paper-50 px-5 py-3">
            <h3 className="text-[13px] font-semibold text-ink-800">
              目标体积达成情况
              <span className="ml-2 font-normal text-ink-400">
                目标 {targetLabel} · 成功 {stats.length - failedCount}/{stats.length}
              </span>
            </h3>
          </div>
          <ul className="divide-y divide-ink-900/[0.05]">
            {stats.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink-800">{s.name}</span>
                <span className="tabular-nums text-ink-500">
                  {formatBytes(s.before)} → <b className={s.achieved ? 'text-jade-700' : 'text-clay-500'}>{formatBytes(s.after)}</b>
                </span>
                <span className={`chip ${s.achieved ? '!bg-jade-50 !text-jade-700' : '!bg-clay-50 !text-clay-500'}`}>
                  {s.keptOriginal ? '原图已达标' : s.achieved ? '已达标' : '未达标'}
                </span>
                {!s.keptOriginal && (
                  <span className="tabular-nums text-[11px] text-ink-400">
                    {s.width}×{s.height} · 质量 {s.quality}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {failedCount > 0 && (
        <Alert tone="warn" title={`${failedCount} 张压不到目标体积`}>
          这些图片即便降到最低质量并缩到最小尺寸，仍然超过目标。请把目标调大一些，或改用其他图片。
        </Alert>
      )}

      <ResultPanel items={result} zipName="compressed-images.zip" />
      <Note>
        {mode === 'target'
          ? '体积是压缩后实测值，可能略小于目标。压缩会降低画质，建议下载后先预览确认。'
          : '如果原图本身已经压缩过（例如微信保存的 JPG），再压缩的空间会比较小。'}
      </Note>
    </div>
  );
}
