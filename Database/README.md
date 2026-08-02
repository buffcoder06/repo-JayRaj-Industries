# JayRajIndustries Database Project

SDK-style SQL database project (`Microsoft.Build.Sql`) capturing the full schema
of the `JAYRAJ_INDUSTRIES` database as source-controlled `.sql` files — one file
per table/stored procedure, indexes inline with their owning table.

Extracted from the live database via `SqlPackage /Action:Extract` +
`/Action:Script`, then split into per-object files. Replaces the old
`Scripts/` folder of loose, ad-hoc scripts.

## Build

```
dotnet build Database/
```

Produces `Database/bin/Debug/JayRajIndustries.dacpac`. Not checked in —
`bin/`/`obj/` are already covered by the repo's `.gitignore`.

## Publish / schema drift check

```
sqlpackage /Action:Publish /SourceFile:Database/bin/Debug/JayRajIndustries.dacpac /TargetConnectionString:"..."
```

`/Action:DeployReport` (instead of `Publish`) shows what would change without
applying it — useful for detecting drift between this project and a live
database before making it the deploy target.

## Findings from the extraction (not fixed, flagging for awareness)

- **`dbo.temp1` / `dbo.temp2`** — present in the live database (5 rows each),
  not referenced anywhere in the application code. Look like scratch/dev
  tables. Included here since the project aims to reflect the live schema
  faithfully, but worth confirming whether they're still needed.
- **`sp_Get_BulkComponentWiseData`** — likewise not called from anywhere in
  the C# codebase. Possibly used by an external report/tool, or leftover.
- **`sp_Deactivate_Records`** references `t_JR_Chalan_Process_dtls` (lowercase
  "d") while the actual table is `t_JR_Chalan_Process_Dtls` (uppercase "D").
  Harmless under the database's case-insensitive collation — SQL Server
  resolves it correctly — but the build reports it as a `SQL71558` warning.
  Not changed here since it's existing, working stored-procedure code.
