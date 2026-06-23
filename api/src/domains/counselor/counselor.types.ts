export interface ClassDashboardItem {
  class_id: string;
  class_name: string;
  college_name: string;
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
  absent_count: number;
}

export interface DashboardSummary {
  total_students: number;
  checked_in_count: number;
  check_in_rate: number;
}

export interface CounselorDashboard {
  date: string;
  classes: ClassDashboardItem[];
  summary: DashboardSummary;
}

export interface ClassStudentItem {
  student_id: string;
  student_name: string;
  student_school_id: string;
  checked_in: boolean;
  checked_in_at: string | null;
  status: string | null;
  reflection_content: string | null;
  consecutive_absent_days: number;
}

export interface ClassStudentList {
  class_id: string;
  class_name: string;
  date: string;
  students: ClassStudentItem[];
}

export type StudentFilterStatus = 'all' | 'checked_in' | 'absent';
