from pyteal import *

def approval():
    checked = Bytes("checked_in")

    on_create = Seq([
        App.globalPut(checked, Int(0)),
        Return(Int(1))
    ])

    # This is the check-in logic
    check_in = Seq([
        Assert(App.globalGet(checked) == Int(0)),
        App.globalPut(checked, Int(1)),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, check_in],
    )

    return program

def clear():
    return Return(Int(1))

if __name__ == "__main__":
    print(compileTeal(approval(), mode=Mode.Application, version=8))
