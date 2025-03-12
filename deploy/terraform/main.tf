provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.azs
  name_prefix = var.name_prefix
}

module "eks" {
  source = "./modules/eks"

  environment         = var.environment
  name_prefix         = var.name_prefix
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  eks_version         = var.eks_version
  eks_instance_types  = var.eks_instance_types
  eks_desired_size    = var.eks_desired_size
  eks_min_size        = var.eks_min_size
  eks_max_size        = var.eks_max_size
}

module "rds" {
  source = "./modules/rds"

  environment        = var.environment
  name_prefix        = var.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_instance_class  = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
}

module "elasticache" {
  source = "./modules/elasticache"

  environment        = var.environment
  name_prefix        = var.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  redis_node_type    = var.redis_node_type
  redis_engine_version = var.redis_engine_version
}

module "route53" {
  source = "./modules/route53"

  environment = var.environment
  domain_name = var.domain_name
  lb_dns_name = module.eks.lb_dns_name
  lb_zone_id  = module.eks.lb_zone_id
}

module "acm" {
  source = "./modules/acm"

  environment = var.environment
  domain_name = var.domain_name
  zone_id     = module.route53.zone_id
}

module "s3" {
  source = "./modules/s3"

  environment = var.environment
  name_prefix = var.name_prefix
}

module "cloudfront" {
  source = "./modules/cloudfront"

  environment      = var.environment
  domain_name      = var.domain_name
  s3_bucket_domain = module.s3.bucket_domain_name
  acm_certificate_arn = module.acm.certificate_arn
}

module "iam" {
  source = "./modules/iam"

  environment = var.environment
  name_prefix = var.name_prefix
}

module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment
  name_prefix = var.name_prefix
}

module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
  name_prefix = var.name_prefix
  repository_names = [
    "frontend",
    "api-service",
    "data-service",
    "signal-service",
    "scoring-service",
    "agent-engine"
  ]
} 