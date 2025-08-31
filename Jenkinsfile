
pipeline {
    agent any

    environment {
        AWS_REGION     = "us-east-1"
        AWS_ACCOUNT_ID = "016311861830"
        ECR_REPO_NAME  = "dev/crypto-backend"
        IMAGE_TAG      = "${GIT_COMMIT}"  // Use Git commit SHA as image tag
        ECS_CLUSTER    = "my-ecs-cluster"
        ECS_SERVICE    = "backend-service"
        TASK_DEF_NAME  = "backend-task"  // your task definition family
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/ankit-ht/crypto-dashboard-backend.git',
                    credentialsId: 'github-token'
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

        stage('Build and Push Docker Image') {
            steps {
                sh '''
                    cd server
                    docker build -t $ECR_REPO_NAME:$IMAGE_TAG .
                    docker tag $ECR_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Register New Task Definition') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                  credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        NEW_TASK_DEF=$(aws ecs register-task-definition \
                            --family $TASK_DEF_NAME \
                            --container-definitions "[
                                {
                                    \\"name\\": \\"backend\\",
                                    \\"image\\": \\"$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG\\",
                                    \\"essential\\": true,
                                    \\"memory\\": 512,
                                    \\"cpu\\": 256,
                                    \\"portMappings\\": [{\\"containerPort\\": 5000, \\"hostPort\\": 5000}]
                                }
                            ]" \
                            --requires-compatibilities EC2 \
                            --query 'taskDefinition.taskDefinitionArn' \
                            --output text)

                        echo "New Task Definition ARN: $NEW_TASK_DEF"

                        aws ecs update-service \
                            --cluster $ECS_CLUSTER \
                            --service $ECS_SERVICE \
                            --task-definition $NEW_TASK_DEF \
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
