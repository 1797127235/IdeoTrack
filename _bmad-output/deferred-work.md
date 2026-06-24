## Deferred from: code review of 8-3-yi-jian-ti-xing (2026-06-24)

- Multi-instance WeChat access-token cache — not needed for V1 single-instance deployment. `api/src/lib/wechat.ts`
- No rate-limiting on reminder endpoint — follow existing project pattern; revisit for V2 if abuse becomes a concern. `api/src/domains/counselor/counselor.routes.ts`

## V2 待办一：人脸识别打卡校验（来自 sprint-change-proposal-2026-06-24-v3）

- 合规前置：人脸属生物特征，受《个人信息保护法》《人脸识别技术应用安全管理规定》约束，须先经学校（学工处/信息中心/法务）审批，明确采集用途、存储期限、是否留存原始图像。
- 方案候选：A 第三方云服务（微信人脸核验/腾讯云/阿里云）；B 后端自建 1:1 比对。
- 架构方向（待 V2 落定）：仿 AD-3 做 `FaceVerificationProvider` 可切换适配器；优先存比对结果而非原始图像；原始图像若须留存则加密对象存储 + 短保留期。
- 触发条件：合规审批通过 + 技术选型确定后进入 V2 实施。

## V2 待办二：自托管富媒体任务内容 P3（来自 sprint-change-proposal-2026-06-24-v3）

- 含**自托管**图片/视频/PDF 文件上传、富文本编辑器（视频 URL 外部链接已进 MVP，见 AD-22）。
- 依赖：通用文件存储基建（当前 AD-7 仅为导出报告设计，需扩展为通用媒体存储，V2 新增 AD）。
- 含上传接口、文件类型/大小限制、CDN、图片审核（OCR+图像）、小程序富文本/视频适配。
- 触发条件：V2 文件存储基建完成后。

