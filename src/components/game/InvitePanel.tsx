'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

interface InvitePanelProps {
  roomId: string;
}

export function InvitePanel({ roomId }: InvitePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomId}`
    : '';

  useEffect(() => {
    if (!inviteUrl) return;
    let cancelled = false;
    QRCode.toDataURL(inviteUrl, { width: 200, margin: 2 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [inviteUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级：选中文本手动复制
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="text-white/50 text-xs">邀请好友加入</div>

      {/* 二维码 */}
      {qrDataUrl && (
        <div className="bg-white p-2 rounded-lg">
          <img src={qrDataUrl} alt="房间邀请二维码" width={150} height={150} />
        </div>
      )}

      {/* 链接 */}
      <div className="flex items-center gap-2 w-full max-w-xs">
        <code className="flex-1 bg-white/10 rounded px-3 py-1.5 text-xs text-white/80 truncate select-all">
          {inviteUrl}
        </code>
        <button
          onClick={handleCopy}
          className={[
            'shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors',
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/10 text-white/70 hover:bg-white/20',
          ].join(' ')}
        >
          {copied ? '已复制' : '复制邀约链接'}
        </button>
      </div>
    </div>
  );
}
