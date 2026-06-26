"use client";

import DataTable from "@/components/DataTable";
import { operations } from "@/lib/data";
import { Button, Card, Input, Select } from "@/components/ui";

export default function OperationsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-ink)]">操作日志</h2>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="text" placeholder="搜索操作内容" className="w-72" />
          <Select className="w-40">
            <option>全部操作</option>
            <option>创建</option>
            <option>修改</option>
            <option>导出</option>
            <option>禁用</option>
          </Select>
          <Button>搜索</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="overflow-x-auto">
          <DataTable
            columns={[
              { key: "time", header: "时间" },
              { key: "user", header: "操作人" },
              { key: "action", header: "操作" },
              { key: "target", header: "对象" },
            ]}
            rows={operations}
            rowKey={(row) => row.id}
          />
        </div>
      </Card>
    </div>
  );
}
