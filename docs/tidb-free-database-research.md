# TiDB Cloud Starter Research — 13 August 2026

## Verified Fit for FocusPath

TiDB Cloud Starter provides a managed MySQL-compatible database with a no-cost quota. The official documentation states that no credit card is required to start, and that the included free quota per Starter instance includes 5 GiB of row-based storage and 50 million request units per month. TiDB supports direct MySQL protocol connections, which suits this Node.js/Drizzle/MySQL backend running as a Render Web Service.

TiDB Cloud Starter and Essential instances require TLS for direct connections. The TiDB connection dialog supplies the host, port, user name (which includes a generated prefix), password, and TLS connection details.

## Recommended Use

Create a TiDB Cloud Starter instance for the FocusPath backend. Use its TLS MySQL connection string only as the Render `DATABASE_URL` secret; never send or commit it. The FocusPath schema and migrations must be applied after the service can reach the database.

## Sources

[1] https://docs.pingcap.com/tidbcloud/select-cluster-tier/
[2] https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/
[3] https://docs.pingcap.com/tidbcloud/mysql-compatibility/
