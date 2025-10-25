# media-handler-test
starting point in implementing nautilus media service.
Could be served as part of monolithic node app or as separate microservice.

Features:
- uses adminApi to auto-correct configuration errors in the S3 server.
  this solves problem of manually configuring it every time I stop my container in proxmox

- Operation are specified with an opcode, then the S3 path is calculated
  user params are validated and escaped and interpolated with the path.

- RBAC is specified for key nautilus roles.
  In case of microservice, we get token from http header and validate it
  For testing, we get a new token and validate it
  We check user roles against operation rbac. if the role is self*,
  it means that the user is authorized only to act on owner resources.
  This check is done at db level, still unsure how, maybe a callback in the idBuilder (selfCheck(params) => {...})

- path migrations and adding new buckets + key should be automatic and configurable

- images are trasnformed to .webp, then in the download endpoint we apply transforms on the fly

- docs should be compressed and encrypted at rest (maybe also images)

- Next steps:
1. finish upload chain
2. start download chain (transform on the fly + presignedurl with reverse proxy)
3. suggestions??
