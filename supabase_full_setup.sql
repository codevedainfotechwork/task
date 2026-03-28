-- TaskFlow one-shot Supabase setup
-- Run this once in the Supabase SQL editor after creating a fresh database.

create table if not exists public.users (
  id bigserial primary key,
  name varchar(100) not null,
  username varchar(100),
  email varchar(100) not null unique,
  password varchar(255),
  role varchar(20) not null default 'employee',
  department text,
  isactive boolean not null default true,
  createdby bigint references public.users(id) on delete set null,
  managerid bigint references public.users(id) on delete set null,
  invitetoken varchar(255),
  inviteexpiry timestamp,
  adminaccessseed text,
  adminaccessfilehash text,
  adminaccessfilename varchar(255),
  adminaccessissuedat timestamp,
  createdat timestamp not null default now()
);

create table if not exists public.departments (
  id bigserial primary key,
  name varchar(100) not null unique,
  isdeleted boolean not null default false,
  createdat timestamp not null default now()
);

create table if not exists public.tasks (
  id bigserial primary key,
  title varchar(255) not null,
  description text,
  duedate date,
  startdate date,
  priority varchar(50) not null default 'Medium',
  reminderTime varchar(255),
  status varchar(50) not null default 'Pending',
  employeecomment text,
  employeecommentat timestamp,
  isarchived boolean not null default false,
  istransferred boolean not null default false,
  transferredat varchar(255),
  transferredfrommanagerid bigint,
  transferredfrommanagername varchar(255),
  transferredtomanagerid bigint,
  transferredtomanagername varchar(255),
  transferstatus varchar(50) not null default 'none',
  transferreason text,
  assignedto bigint references public.users(id) on delete cascade,
  assignedby bigint references public.users(id) on delete cascade,
  department varchar(100),
  completedat timestamp,
  createdat timestamp not null default now()
);

create table if not exists public.notifications (
  id bigserial primary key,
  userid bigint not null references public.users(id) on delete cascade,
  taskid bigint references public.tasks(id) on delete set null,
  title varchar(255) not null,
  message text not null,
  type varchar(50) not null default 'info',
  isread boolean not null default false,
  link varchar(255),
  description text,
  tasktitle varchar(255),
  transfermeta text,
  createdat timestamp not null default now()
);

create table if not exists public.help_requests (
  id bigserial primary key,
  requesterid bigint not null references public.users(id) on delete cascade,
  requestername varchar(255) not null,
  requesterrole varchar(50) not null default 'employee',
  managerid bigint not null references public.users(id) on delete cascade,
  managername varchar(255),
  department varchar(255),
  subject varchar(255) not null,
  description text not null,
  reply text,
  status varchar(50) not null default 'Open',
  repliedby bigint references public.users(id) on delete set null,
  repliedbyname varchar(255),
  repliedat timestamp,
  createdat timestamp not null default now()
);

create table if not exists public.activity_logs (
  id bigserial primary key,
  userid bigint references public.users(id) on delete set null,
  action varchar(255) not null,
  details text,
  ipaddress varchar(45),
  useragent text,
  createdat timestamp not null default now()
);

create table if not exists public.settings (
  id bigserial primary key,
  companyname varchar(255) not null default 'TASKFLOW',
  logodataurl text
);

create table if not exists public.task_attachments (
  id bigserial primary key,
  taskid bigint not null references public.tasks(id) on delete cascade,
  originalname varchar(255) not null,
  storedname varchar(255) not null,
  mimetype varchar(120) not null,
  size integer not null,
  uploadedby bigint references public.users(id) on delete set null,
  createdat timestamp not null default now()
);

create table if not exists public.push_subscriptions (
  id bigserial primary key,
  userid bigint not null references public.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  expirationtime bigint,
  useragent text,
  createdat timestamp not null default now(),
  updatedat timestamp not null default now()
);

create index if not exists idx_tasks_department on public.tasks (department);
create index if not exists idx_tasks_assigned_to on public.tasks (assignedto);
create index if not exists idx_tasks_assigned_by on public.tasks (assignedby);
create index if not exists idx_notifications_user_id on public.notifications (userid);
create index if not exists idx_help_requests_manager_id on public.help_requests (managerid);
create index if not exists idx_help_requests_requester_id on public.help_requests (requesterid);
create index if not exists idx_help_requests_status on public.help_requests (status);
create index if not exists idx_task_attachments_task_id on public.task_attachments (taskid);
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions (userid);
create index if not exists idx_users_username on public.users (username);

insert into public.departments (name)
select d.name
from (
  values
    ('Engineering'),
    ('Design'),
    ('Marketing'),
    ('Sales'),
    ('HR'),
    ('Legal')
) as d(name)
where not exists (
  select 1 from public.departments existing where existing.name = d.name
);

insert into public.settings (companyname, logodataurl)
select 'TASKFLOW', null
where not exists (select 1 from public.settings);

insert into public.users (
  name,
  username,
  email,
  password,
  role,
  department,
  isactive,
  createdby,
  managerid,
  adminaccessseed,
  adminaccessfilehash,
  adminaccessfilename,
  adminaccessissuedat,
  createdat
)
select
  'Denish',
  'Denish',
  'denish@gmail.com',
  '$2b$10$A/HjxbmLe/QQ5k1vrmCLcOIf.6w9w1ZaaRmniw6uOimp9/Z5nN82C',
  'admin',
  '[]',
  true,
  null,
  null,
  'denish-admin-seed',
  null,
  'denish.taskauth',
  now(),
  now()
where not exists (
  select 1 from public.users where lower(username) = lower('Denish')
);

-- If Denish already exists, normalize it to the expected temp admin login.
update public.users
set
  name = 'Denish',
  username = 'Denish',
  email = 'denish@gmail.com',
  password = '$2b$10$A/HjxbmLe/QQ5k1vrmCLcOIf.6w9w1ZaaRmniw6uOimp9/Z5nN82C',
  role = 'admin',
  department = '[]',
  isactive = true,
  adminaccessseed = 'denish-admin-seed',
  adminaccessfilehash = null,
  adminaccessfilename = 'denish.taskauth',
  adminaccessissuedat = now()
where lower(username) = lower('Denish') or lower(email) = lower('denish@gmail.com');
