/**
 * 根据用户角色跳转到对应首页
 * - student -> 学生首页
 * - counselor / admin -> 教师端班级页
 */
export function navigateByRole(role?: string | null): void {
  const target =
    role === 'counselor' || role === 'admin'
      ? '/pages/teacher/classes/index'
      : '/pages/student/home/index';

  wx.redirectTo({ url: target });
}

export function getHomePath(role?: string | null): string {
  return role === 'counselor' || role === 'admin'
    ? '/pages/teacher/classes/index'
    : '/pages/student/home/index';
}
