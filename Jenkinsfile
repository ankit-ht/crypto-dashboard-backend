pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        AWS_ACCOUNT_ID = "016311861830"
        ECR_REPO_NAME  = "dev/crypto-backend"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/ankit-ht/crypto-dashboard-backend.git',
                    credentialsId: 'github-token'
                
                script {
                    env.IMAGE_TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                }
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

        stage('Build & Tag Docker Image') {
            steps {
                dir('server') {
                    sh """
                        docker build -t $ECR_REPO_NAME:$IMAGE_TAG .
                        docker tag $ECR_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                    """
                }
            }
        }

        stage('Push Docker Image to ECR') {
            steps {
                sh """
                    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                """
            }
        }

        stage('Cleanup Local Docker Images') {
            steps {
                sh """
                    docker rmi $ECR_REPO_NAME:$IMAGE_TAG || true
                    docker rmi $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG || true
                """
            }
        }

        stage('Register New ECS Task Definition') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        TASK_DEF_ARN=$(aws ecs describe-services \
                            --cluster my-ecs-cluster \
                            --services backend-service \
                            --query "services[0].taskDefinition" \
                            --output text)

                        NEW_TASK_DEF=$(aws ecs register-task-definition \
                            --cli-input-json "$(aws ecs describe-task-definition \
                                --task-definition $TASK_DEF_ARN \
                                --query 'taskDefinition | {family:family, containerDefinitions:containerDefinitions}' \
                                --output json | \
                                jq --arg IMAGE "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG" \
                                   '.containerDefinitions[0].image=$IMAGE')" \
                            --query "taskDefinition.taskDefinitionArn" \
                            --output text)

                        aws ecs update-service \
                            --cluster my-ecs-cluster \
                            --service backend-service \
                            --task-definition $NEW_TASK_DEF \
                            --force-new-deployment
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Deployment successful! Image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG"
        }
        failure {
            echo "Deployment failed!"
        }
    }
}
