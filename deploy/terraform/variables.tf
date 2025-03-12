variable "aws_region" {
  description = "The AWS region to deploy to"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "The environment to deploy to (e.g. staging, production)"
  type        = string
}

variable "name_prefix" {
  description = "The prefix to use for all resources"
  type        = string
  default     = "liqpro"
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "The availability zones to deploy to"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "eks_version" {
  description = "The version of Kubernetes to use for the EKS cluster"
  type        = string
  default     = "1.27"
}

variable "eks_instance_types" {
  description = "The instance types to use for the EKS cluster"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_size" {
  description = "The desired number of nodes in the EKS cluster"
  type        = number
  default     = 3
}

variable "eks_min_size" {
  description = "The minimum number of nodes in the EKS cluster"
  type        = number
  default     = 2
}

variable "eks_max_size" {
  description = "The maximum number of nodes in the EKS cluster"
  type        = number
  default     = 5
}

variable "db_instance_class" {
  description = "The instance class to use for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "The name of the database to create"
  type        = string
  default     = "liqpro"
}

variable "db_username" {
  description = "The username for the database"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "The password for the database"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "The node type to use for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_engine_version" {
  description = "The engine version to use for the ElastiCache Redis cluster"
  type        = string
  default     = "6.2"
}

variable "domain_name" {
  description = "The domain name to use for the application"
  type        = string
  default     = "liqpro.ai"
} 