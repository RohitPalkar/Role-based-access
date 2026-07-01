# ER Diagram — RBAC Database Schema

```mermaid
erDiagram
    %% ========================================================================
    %% MASTER TABLES
    %% ========================================================================
    ZONES {
        int id PK
        varchar name UK
        varchar code UK
        varchar description
        enum status
        timestamp created_at
        timestamp updated_at
    }

    CITIES {
        int id PK
        varchar name
        int zone_id FK
        enum status
        timestamp created_at
        timestamp updated_at
    }

    LEVELS {
        int id PK
        varchar code UK
        varchar name
        varchar description
        int sort_order
        timestamp created_at
        timestamp updated_at
    }

    DEPARTMENTS {
        int id PK
        varchar name UK
        varchar code UK
        varchar level
        enum status
        timestamp created_at
        timestamp updated_at
    }

    ROLE_DEFINITIONS {
        int id PK
        varchar name UK
        varchar code UK
        int department_id FK
        int level_id FK
        text description
        enum status
        timestamp created_at
        timestamp updated_at
    }

    MODULE_DEFINITIONS {
        int id PK
        varchar name
        varchar code UK
        int parent_id FK "self-ref"
        varchar icon
        varchar route_path
        int sort_order
        enum status
        timestamp created_at
        timestamp updated_at
    }

    SUB_MODULE_DEFINITIONS {
        int id PK
        varchar name
        varchar code
        int module_id FK
        varchar route_path
        int sort_order
        enum status
        timestamp created_at
        timestamp updated_at
    }

    ACTION_DEFINITIONS {
        int id PK
        varchar name
        varchar code
        int module_id FK "nullable"
        int sub_module_id FK "nullable"
        tinyint is_custom
        timestamp created_at
        timestamp updated_at
    }

    %% ========================================================================
    %% CORE PERMISSION MAPPING
    %% ========================================================================
    DEPT_ROLE_MODULE_MAPPINGS {
        bigint id PK
        int department_id FK
        int role_definition_id FK
        int module_id FK
        int sub_module_id FK "nullable"
        int action_id FK "nullable"
        int level_id FK
        enum status
        int created_by FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    %% ========================================================================
    %% USER ASSIGNMENTS
    %% ========================================================================
    USERS {
        int id PK "existing"
        varchar name
        varchar email
        int role_id FK "existing - deprecated"
        int zone_id FK "NEW"
        varchar employment_status "NEW"
        varchar user_group "NEW"
        date group_start_date "NEW"
        date group_end_date "NEW"
        %% ... other existing columns
    }

    USER_ROLE_ASSIGNMENTS {
        bigint id PK
        int user_id FK
        int role_definition_id FK
        tinyint is_primary
        json project_access
        enum status
        int assigned_by FK "nullable"
        timestamp assigned_at
        timestamp revoked_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    USER_HIERARCHIES {
        int id PK
        int user_id FK UK
        int manager_id FK "nullable - L2"
        int team_admin_id FK "nullable - L3"
        int dept_admin_id FK "nullable - L4"
        timestamp created_at
        timestamp updated_at
    }

    USER_PROJECT_MODULE_ACCESS {
        bigint id PK
        int user_id FK
        int project_id FK
        int module_id FK
        tinyint is_enabled
        timestamp created_at
        timestamp updated_at
    }

    %% ========================================================================
    %% EXISTING TABLES (modified)
    %% ========================================================================
    PROJECTS {
        int id PK "existing"
        varchar billing_entity "NEW"
        varchar company "NEW"
        text address "NEW"
        varchar gstin "NEW"
        varchar pin_code "NEW"
        varchar payment_gateway "NEW"
        enum incentive_criteria "NEW"
        %% ... other existing columns
    }

    BRANDS {
        int id PK "existing"
        text address "NEW"
        varchar gstin "NEW"
        varchar pan "NEW"
        varchar billing_entity "NEW"
        %% ... other existing columns
    }

    %% ========================================================================
    %% AUDIT
    %% ========================================================================
    PERMISSION_AUDIT_LOG {
        bigint id PK
        enum action
        varchar entity_type
        int entity_id
        json old_value
        json new_value
        int performed_by FK
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }

    %% ========================================================================
    %% RELATIONSHIPS
    %% ========================================================================

    %% Zone → City
    ZONES ||--o{ CITIES : contains

    %% Department → Role
    DEPARTMENTS ||--o{ ROLE_DEFINITIONS : defines
    LEVELS ||--o{ ROLE_DEFINITIONS : classifies

    %% Module hierarchy
    MODULE_DEFINITIONS ||--o{ MODULE_DEFINITIONS : "parent-child"
    MODULE_DEFINITIONS ||--o{ SUB_MODULE_DEFINITIONS : has
    MODULE_DEFINITIONS ||--o{ ACTION_DEFINITIONS : scopes

    %% Core mapping
    DEPARTMENTS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps dept"
    ROLE_DEFINITIONS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps role"
    MODULE_DEFINITIONS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps module"
    SUB_MODULE_DEFINITIONS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps sub-module"
    ACTION_DEFINITIONS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps action"
    LEVELS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "maps level"

    %% User assignments
    USERS ||--o{ USER_ROLE_ASSIGNMENTS : assigned
    ROLE_DEFINITIONS ||--o{ USER_ROLE_ASSIGNMENTS : "to role"
    USERS ||--o{ USER_HIERARCHIES : "has hierarchy"
    USERS ||--o{ USER_HIERARCHIES : "managed by" as MANAGED
    USERS ||--o{ USER_PROJECT_MODULE_ACCESS : scoped
    PROJECTS ||--o{ USER_PROJECT_MODULE_ACCESS : "to project"
    MODULE_DEFINITIONS ||--o{ USER_PROJECT_MODULE_ACCESS : "for module"

    %% Audit
    USERS ||--o{ PERMISSION_AUDIT_LOG : "performs"
    USERS ||--o{ DEPT_ROLE_MODULE_MAPPINGS : "created by"

    %% Zone on user
    ZONES ||--o{ USERS : "user zone"
```

## Table Summary

| # | Table | Type | Rows (Est.) | Description |
|---|-------|------|-------------|-------------|
| 1 | `zones` | Master | 4–10 | Geographic zones (West, East, etc.) |
| 2 | `cities` | Master | 50–200 | Cities within zones |
| 3 | `levels` | Master | 4 | Hierarchy (L1–L4) |
| 4 | `departments` | Master | 10–20 | Business departments |
| 5 | `role_definitions` | Master | 18–30 | Roles with department + level |
| 6 | `module_definitions` | Master | 18 | Feature modules (top-level) |
| 7 | `sub_module_definitions` | Master | 30–50 | Sub-modules under modules |
| 8 | `action_definitions` | Master | 60–80 | CRUD + custom actions |
| 9 | `dept_role_module_mappings` | Mapping | 500–5000 | Core permission assignments |
| 10 | `user_role_assignments` | Assignment | N*2 | User → Role (primary + secondary) |
| 11 | `user_hierarchies` | Assignment | N | User → L2/L3/L4 managers |
| 12 | `user_project_module_access` | Assignment | N*P*M | Per-project module toggles |
| 13 | `permission_audit_log` | Audit | High | All permission change logs |

## Entity Relationship Summary

```
Zones ──< Cities
          │
          ├──< Users (zone_id)
          │
Departments ──< Role_Definitions
               │              │
               │              └──< Level (L1–L4)
               │
               ├──< Dept_Role_Module_Mappings
               │    │
               │    ├──< Module_Definitions ──< Sub_Module_Definitions
               │    │    │
               │    │    └──< Action_Definitions
               │    │
               │    └──< Levels (hierarchy level for the mapping)
               │
Levels ──< Role_Definitions
       │
       └──< Dept_Role_Module_Mappings

User_Role_Assignments ──< Users
                     │    │
                     │    ├──< User_Hierarchies (L2/L3/L4)
                     │    │
                     │    └──< User_Project_Module_Access
                     │         │
                     │         ├──< Projects
                     │         └──< Module_Definitions
                     │
                     └──< Role_Definitions

Permission_Audit_Log ──< Users (performed_by)
```
