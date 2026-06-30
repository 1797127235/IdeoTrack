from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path


SLIDE_SCRIPTS = [
    "大家好，今天介绍 IdeoTrack，一个面向高校思政教育的过程管理平台。它解决的核心问题，是让学院实时掌握每一次思政教育任务的完成率、覆盖率和过程材料。",
    "先看一个很典型的场景。每周三晚上十点，辅导员收到通知，第二天上午要上报青年大学习完成情况。老师需要打开多个班级群，下载两百多张截图，逐个核对学号，再整理未交名单。一次任务往往要花大半小时到两小时。IdeoTrack 要做的，就是把这件事压缩到几分钟。",
    "现在的问题不是没有数据，而是数据被淹没在班级群、表格和文件夹里。任务从发布、学生打卡、截图提交，到人工汇总和上级检查，整个链条高度依赖手工。学院看不到实时进度，也很难回答哪个班级最薄弱、哪些学生还没完成，历史材料也缺少可追溯记录。",
    "这套流程同时压在三层人身上。班负责人要收材料、改文件名、核对名单；辅导员要跨多个班级追缺勤、汇总上报；学院和学校层面则缺少实时覆盖率，只能靠抽查和临时材料。结果是基层耗时，管理端却仍然看不见全局。",
    "IdeoTrack 的定位，是高校思政教育的过程管理平台。辅导员在后台发布任务并生成二维码，学生通过微信小程序随手打卡，系统自动汇总、归档，并生成未交名单。学院端可以看到实时覆盖率，按班级、学生、任务下钻，也能一键导出 Word 或 Excel 报告。",
    "它带来的价值分为三类。对辅导员，是减负：从逐一核查变成自动归档和一键导出。对学生，是省事：扫码即可完成，不需要安装新 App，也不改变原有习惯。对学院和学校，是看见：实时数据看板让任务过程从黑箱变成透明，可追溯、可汇报。",
    "从操作流程看，IdeoTrack 非常轻。第一步，后台创建任务，设置名称、时间和目标班级。第二步，学生扫码打卡并上传材料。第三步，AI 自动审核，异常情况进入人工复核。第四步，看板实时更新覆盖率和未交名单。最后，一键导出报告，原来大半小时的整理工作变成几分钟。",
    "这个市场需求正在被政策和技术共同推动。全国普通高校数量接近三千所，思政数字化管理的渗透率仍然偏低。政策端强调教育数字化和过程评价，技术端的 AI 审核、异常识别和自动报告已经具备落地条件。IdeoTrack 不做单点工具，而是做任务闭环和管理决策支持。",
    "在系统架构上，IdeoTrack 坚持数据不出校。学校拥有全部数据主权，部署和存储可以满足审计要求。前端小程序负责学生打卡，后台管理系统负责任务、审核、看板和报告，AI 能力在校内数据边界内服务于审核与分析。",
    "这不是简单的功能堆砌，而是三层壁垒。第一，闭环数据资产，从任务发布到报告导出，每条记录都在平台留痕。第二，思政领域模板库，高频任务越多，新学院上线越快，边际成本越低。第三，高校私有化合规，数据本地存储和审计能力本身就是准入门槛。",
    "商业化上，IdeoTrack 先从学院版切入，用 SaaS 年费模式跑通基础任务闭环；再扩展到学校版，支持多学院部署、校级看板和权限管理；最终可以走向区域版，为教育局或多校联盟提供汇总分析。增值服务包括定制内容模板、数据分析报告，以及与现有学工系统对接。",
    "当然，风险也很清楚。高校采购周期长，所以先做学院级试点，用一个月的数据证明价值。学生信息敏感，所以采用私有化部署和本地存储。老师有使用惯性，所以通过标准模板和一键复制降低学习成本。学生动力不足的问题，则通过轻量小程序和低摩擦流程来缓解。",
    "总结一下，IdeoTrack 要让思政教育过程可量化、可追溯、可汇报。下一次学院检查完成情况时，不再需要临时抽调材料，只要打开看板，完成率、未交名单和历史记录都清晰可见。",
    "以上就是 IdeoTrack 的核心价值：让思政教育看得见。谢谢大家，欢迎提问。",
]


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("+", " ".join(str(x) for x in cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def natural_slide_key(path: Path) -> int:
    match = re.search(r"(\d+)", path.stem)
    return int(match.group(1)) if match else 0


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / float(wf.getframerate())


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def synthesize_with_sapi(script_path: Path, out_dir: Path) -> None:
    ps = r"""
param(
  [Parameter(Mandatory=$true)][string]$ScriptJson,
  [Parameter(Mandatory=$true)][string]$OutDir
)
$ErrorActionPreference = 'Stop'
$scripts = Get-Content -Raw -LiteralPath $ScriptJson | ConvertFrom-Json
$voice = New-Object -ComObject SAPI.SpVoice
$target = $null
foreach ($v in $voice.GetVoices()) {
  if ($v.GetDescription() -like '*Chinese*' -or $v.GetDescription() -like '*Huihui*') {
    $target = $v
    break
  }
}
if ($null -ne $target) {
  $voice.Voice = $target
}
$voice.Rate = -1
$voice.Volume = 100
$format = New-Object -ComObject SAPI.SpAudioFormat
$format.Type = 22
for ($i = 0; $i -lt $scripts.Count; $i++) {
  $file = Join-Path $OutDir ("narration_{0:D2}.wav" -f ($i + 1))
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format = $format
  $stream.Open($file, 3, $false)
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak([string]$scripts[$i], 0)
  $stream.Close()
}
"""
    ps_path = out_dir / "synthesize_sapi.ps1"
    ps_path.write_text(ps, encoding="utf-8")
    run([
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(ps_path),
        "-ScriptJson",
        str(script_path),
        "-OutDir",
        str(out_dir),
    ])


def make_clip(ffmpeg: str, image: Path, audio: Path, duration: float, out_path: Path) -> None:
    fade_out_start = max(0.0, duration - 0.35)
    vf = (
        "scale=1920:1080:force_original_aspect_ratio=decrease,"
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,"
        "format=yuv420p,"
        "fade=t=in:st=0:d=0.25,"
        f"fade=t=out:st={fade_out_start:.3f}:d=0.35"
    )
    run([
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-framerate",
        "30",
        "-i",
        str(image),
        "-i",
        str(audio),
        "-t",
        f"{duration:.3f}",
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-shortest",
        str(out_path),
    ])


def main() -> int:
    if len(sys.argv) != 5:
        print(
            "usage: create_ideotrack_pitch_video.py <slides_png_dir> <work_dir> <output_mp4> <ffmpeg>",
            file=sys.stderr,
        )
        return 2

    slides_dir = Path(sys.argv[1]).resolve()
    work_dir = Path(sys.argv[2]).resolve()
    output_mp4 = Path(sys.argv[3]).resolve()
    ffmpeg = sys.argv[4]

    work_dir.mkdir(parents=True, exist_ok=True)
    audio_dir = work_dir / "audio"
    clip_dir = work_dir / "clips"
    audio_dir.mkdir(exist_ok=True)
    clip_dir.mkdir(exist_ok=True)

    slides = sorted(slides_dir.glob("slide_*.png"), key=natural_slide_key)
    if len(slides) != len(SLIDE_SCRIPTS):
        raise RuntimeError(f"expected {len(SLIDE_SCRIPTS)} slides, found {len(slides)} in {slides_dir}")

    script_path = work_dir / "narration_scripts.json"
    write_json(script_path, SLIDE_SCRIPTS)
    synthesize_with_sapi(script_path, audio_dir)

    manifest = []
    concat_path = work_dir / "concat.txt"
    concat_lines = []
    for idx, (image, script) in enumerate(zip(slides, SLIDE_SCRIPTS), start=1):
        audio = audio_dir / f"narration_{idx:02d}.wav"
        duration = max(5.0, wav_duration(audio) + 0.7)
        duration = math.ceil(duration * 10) / 10.0
        clip = clip_dir / f"clip_{idx:02d}.mp4"
        make_clip(ffmpeg, image, audio, duration, clip)
        concat_lines.append(f"file '{clip.as_posix()}'")
        manifest.append({
            "slide": idx,
            "image": str(image),
            "audio": str(audio),
            "duration_seconds": duration,
            "script": script,
        })

    concat_path.write_text("\n".join(concat_lines) + "\n", encoding="utf-8")
    output_mp4.parent.mkdir(parents=True, exist_ok=True)
    run([
        ffmpeg,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_path),
        "-c",
        "copy",
        str(output_mp4),
    ])
    write_json(work_dir / "video_manifest.json", manifest)

    sidecar = output_mp4.with_suffix(".scripts.txt")
    sidecar.write_text(
        "\n\n".join(f"{i + 1:02d}. {text}" for i, text in enumerate(SLIDE_SCRIPTS)),
        encoding="utf-8",
    )
    print(output_mp4)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
