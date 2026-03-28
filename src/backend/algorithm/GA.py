#Genetic Algorithm
import gym
import numpy as np
import random
import matplotlib.pyplot as plt

env = gym.make("CartPole-v1")

def initialize_population(pop_size, input_dim, output_dim):
    population = []
    for _ in range(pop_size):
        individual = np.random.randn(input_dim, output_dim) * 0.5 
        population.append(individual)
    return population

def fitness_function(individual, env, max_steps=100):
    state = env.reset()
    done = False
    total_reward = 0
    steps = 0
    while not done and steps < max_steps: 
        action = np.argmax(np.dot(state, individual))  
        state, reward, done, _ = env.step(action)
        total_reward += reward
        steps += 1
        print(f"Step: {steps}, Action: {action}, Reward: {reward}, Total Reward: {total_reward}, Done: {done}")
    return total_reward

def tournament_selection(population, fitness_scores, tournament_size=3):
    selected = []
    for _ in range(len(population)):
        tournament = random.sample(range(len(population)), tournament_size)
        tournament_fitness = [fitness_scores[i] for i in tournament]
        winner = tournament[np.argmax(tournament_fitness)]
        selected.append(population[winner])
    return selected

def crossover(parent1, parent2):
    crossover_point = random.randint(1, len(parent1) - 1)
    offspring1 = np.concatenate((parent1[:crossover_point], parent2[crossover_point:]), axis=0)
    offspring2 = np.concatenate((parent2[:crossover_point], parent1[crossover_point:]), axis=0)
    return offspring1, offspring2

def mutate(individual, mutation_rate=0.05): 
    for i in range(len(individual)):
        if random.random() < mutation_rate:
            individual[i] += np.random.uniform(-0.5, 0.5)  
    return individual

def genetic_algorithm(env, pop_size=50, generations=10, mutation_rate=0.01, max_steps_per_generation=50):
    input_dim = env.observation_space.shape[0]
    output_dim = env.action_space.n
    population = initialize_population(pop_size, input_dim, output_dim)

    for gen in range(generations):
        print(f"Generation {gen} start")
        fitness_scores = []
        for individual in population:
            total_reward = fitness_function(individual, env, max_steps=max_steps_per_generation)
            fitness_scores.append(total_reward)

        print(f"Generation {gen}, Best Fitness: {max(fitness_scores)}")

        selected_population = tournament_selection(population, fitness_scores)

        next_generation = []
        for i in range(0, len(selected_population), 2):
            parent1, parent2 = selected_population[i], selected_population[i + 1]
            offspring1, offspring2 = crossover(parent1, parent2)
            next_generation.append(mutate(offspring1, mutation_rate))
            next_generation.append(mutate(offspring2, mutation_rate))

        population = next_generation

        if gen >= generations:
            print("Reached max generations!")
            break

    return population

def evaluate_best_policy(policy, env, max_steps=500):
    state = env.reset()
    done = False
    total_reward = 0
    steps = 0
    while not done and steps < max_steps:
        action = np.argmax(np.dot(state, policy)) 
        state, reward, done, _ = env.step(action) 
        total_reward += reward
        steps += 1
    print(f"Total Reward: {total_reward}") 

# best_policy = final_population[0]  
# evaluate_best_policy(best_policy, env)