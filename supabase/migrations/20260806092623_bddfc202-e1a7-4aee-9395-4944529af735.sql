-- roles
CREATE TYPE public.app_role AS ENUM ('admin','teacher');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- grades
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades read" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "grades admin write" ON public.grades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- students
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  student_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "students admin write" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- teacher grade assignments
CREATE TABLE public.teacher_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, grade_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_grades TO authenticated;
GRANT ALL ON public.teacher_grades TO service_role;
ALTER TABLE public.teacher_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_grades read" ON public.teacher_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "teacher_grades admin write" ON public.teacher_grades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- sessions (weekly schedule)
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  grade_id uuid NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions read" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions admin write" ON public.sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- attendance
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT current_date,
  status public.attendance_status NOT NULL DEFAULT 'present',
  reason text,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id, session_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance read" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance teacher write" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid());

-- behavior tags
CREATE TYPE public.behavior_type AS ENUM ('positive','negative');

CREATE TABLE public.behavior_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type public.behavior_type NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.behavior_tags TO authenticated;
GRANT ALL ON public.behavior_tags TO service_role;
ALTER TABLE public.behavior_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags read" ON public.behavior_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags write" ON public.behavior_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.behaviors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  tag_id uuid REFERENCES public.behavior_tags(id) ON DELETE SET NULL,
  type public.behavior_type NOT NULL,
  points integer NOT NULL DEFAULT 0,
  comment text,
  consequence text,
  session_date date NOT NULL DEFAULT current_date,
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.behaviors TO authenticated;
GRANT ALL ON public.behaviors TO service_role;
ALTER TABLE public.behaviors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "behaviors read" ON public.behaviors FOR SELECT TO authenticated USING (true);
CREATE POLICY "behaviors teacher write" ON public.behaviors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid());

-- bathroom logs
CREATE TABLE public.bathroom_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  returned_at timestamptz,
  note text,
  recorded_by uuid NOT NULL DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bathroom_logs TO authenticated;
GRANT ALL ON public.bathroom_logs TO service_role;
ALTER TABLE public.bathroom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bathroom read" ON public.bathroom_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "bathroom teacher write" ON public.bathroom_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR recorded_by = auth.uid());

-- new user handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed default behavior tags
INSERT INTO public.behavior_tags (name, type, points) VALUES
  ('Helpful','positive',5),
  ('Active participation','positive',3),
  ('Great work','positive',4),
  ('Noisy','negative',-2),
  ('Late homework','negative',-3),
  ('Disrespectful','negative',-5);