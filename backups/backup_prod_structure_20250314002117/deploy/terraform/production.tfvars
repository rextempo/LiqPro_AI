environment = "production"
name_prefix = "liqpro-prod"

vpc_cidr = "10.0.0.0/16"
azs      = ["us-west-2a", "us-west-2b", "us-west-2c"]

eks_version        = "1.27"
eks_instance_types = ["t3.large"]
eks_desired_size   = 5
eks_min_size       = 3
eks_max_size       = 10

db_instance_class = "db.t3.large"
db_name           = "liqpro"
db_username       = "admin"
# db_password is sensitive and should be provided via environment variable or AWS Secrets Manager

redis_node_type       = "cache.t3.large"
redis_engine_version  = "6.2"

domain_name = "liqpro.ai" 