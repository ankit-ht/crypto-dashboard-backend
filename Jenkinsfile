pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        AWS_ACCOUNT_ID = "016311861830"
        ECR_REPO_NAME  = "dev/crypto-backend"
        IMAGE_TAG      = "${GIT_COMMIT}"  // Use Git commit SHA as image tag
    }

    stages {
        stage('Checkout') {
            steps {
                // Checkout using GitHub PAT stored in Jenkins
                git branch: 'main',
                    url: 'https://github.com/ankit-ht/crypto-dashboard-backend.git',
                    credentialsId: 'github-token'  // GitHub PAT credentials ID
            }
        }

        stage('Login to AWS ECR') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build -t $ECR_REPO_NAME:$IMAGE_TAG .
                    docker tag $ECR_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Deploy to ECS') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        aws ecs update-service \
                            --cluster my-ecs-cluster \
                            --service backend-service \
                            --force-new-deployment \
                            --region $AWS_REGION
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
