variable "location" {
  description = "Region to deploy resources"
  default     = "East US"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  default     = "n8n-benchmarking"
}

variable "host_size_family" {
  description = "Size Family for the Host Group"
  default     = "DCSv2-Type1"
}

variable "vm_size" {
  description = "Size of the VM"
  # 8 vCPUs, 32 GiB memory
  default     = "Standard_F4s_v2"
}

variable "allowed_admin_cidrs" {
  description = "List of CIDR ranges permitted to reach administrative endpoints"
  type        = list(string)
}

variable "number_of_vms" {
  description = "Number of VMs to create"
  default     = 1
}

locals {
  common_tags = {
    Id        = "N8nBenchmark"
    Terraform = "true"
    Owner     = "Catalysts"
    CreatedAt = timestamp()
  }
}
