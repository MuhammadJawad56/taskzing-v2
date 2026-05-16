"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DollarSign, ArrowUp, ArrowDown } from "lucide-react";

export default function WalletPage() {
  const [balance] = useState(1250.50);
  const [transactions] = useState([
    {
      id: "1",
      type: "credit",
      amount: 500,
      description: "Payment received for Task #1234",
      date: "2024-01-20",
    },
    {
      id: "2",
      type: "debit",
      amount: 150,
      description: "Payment for Task #1235",
      date: "2024-01-19",
    },
    {
      id: "3",
      type: "credit",
      amount: 300,
      description: "Payment received for Task #1236",
      date: "2024-01-18",
    },
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Wallet</h1>
        <p className="text-secondary-600 mt-2">Manage your payments and transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-secondary-900">
                  ${balance.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <DollarSign className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600 mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-secondary-900">$5,250.00</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-600 mb-1">Total Spent</p>
                <p className="text-3xl font-bold text-secondary-900">$3,999.50</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ArrowDown className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.type === "credit"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {transaction.type === "credit" ? (
                          <ArrowUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-secondary-600">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        transaction.type === "credit"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "credit" ? "+" : "-"}${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <Input
                label="Amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                max={balance}
              />
              <Input
                label="Bank Account"
                type="text"
                placeholder="Enter account number"
              />
              <Button variant="primary" className="w-full">
                Withdraw
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

