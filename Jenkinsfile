pipeline {
    agent any

    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = '016311861830.dkr.ecr.us-east-1.amazonaws.com/dev/crypto-backend'
        ECS_CLUSTER = 'my-ecs-cluster'
        ECS_SERVICE = 'backend-service'
        TASK_DEFINITION = 'backend-task'
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/<your-public-repo>.git', branch: 'main'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Git short SHA as image tag
                    def IMAGE_TAG = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    
                    // Build Docker image (adjust path if Dockerfile is in subfolder)
                    sh "docker build -t ${ECR_REPO}:${IMAGE_TAG} ."
                    
                    // Save IMAGE_TAG to env for later stages
                    env.IMAGE_TAG = IMAGE_TAG
                }
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO}"
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                sh "docker push ${ECR_REPO}:${env.IMAGE_TAG}"
            }
        }

        stage('Update ECS Service') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
                    script {
                        // Update ECS task definition with new image
                        sh """
                        sed -i 's|\"image\": \".*\"|\"image\": \"${ECR_REPO}:${env.IMAGE_TAG}\"|' ecs-task-def.json
                        aws ecs register-task-definition --cli-input-json file://ecs-task-def.json
                        aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --task-definition ${TASK_DEFINITION}
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployment successful: ${ECR_REPO}:${env.IMAGE_TAG}"
        }
        failure {
            echo "Deployment failed!"
        }
    }
}
